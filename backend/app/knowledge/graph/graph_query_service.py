"""Graph Query Service — traversal cypher query helpers for agent/RAG reasoning."""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.knowledge.graph.neo4j_service import Neo4jService

logger = get_logger(__name__)


class GraphQueryService:
    """Read-only Cypher query routines for quality analysis and context retrieval."""

    @classmethod
    async def get_module_dependencies(cls, module_name: str) -> list[dict[str, Any]]:
        """Get direct dependencies of a module."""
        query = """
        MATCH (m:Module {name: $module_name})-[:DEPENDS_ON]->(dep:Module)
        RETURN dep.name AS name, dep.file_path AS file_path
        """
        return await Neo4jService.execute_query(query, {"module_name": module_name})

    @classmethod
    async def get_module_dependents(cls, module_name: str) -> list[dict[str, Any]]:
        """Get modules that depend on this module."""
        query = """
        MATCH (dep:Module)-[:DEPENDS_ON]->(m:Module {name: $module_name})
        RETURN dep.name AS name, dep.file_path AS file_path
        """
        return await Neo4jService.execute_query(query, {"module_name": module_name})

    @classmethod
    async def get_function_callers(cls, function_name: str) -> list[dict[str, Any]]:
        """Get functions that call the target function."""
        query = """
        MATCH (caller:Function)-[:CALLS]->(f:Function {name: $function_name})
        RETURN caller.name AS name, caller.signature AS signature
        """
        return await Neo4jService.execute_query(query, {"function_name": function_name})

    @classmethod
    async def get_function_callees(cls, function_name: str) -> list[dict[str, Any]]:
        """Get functions called by the target function."""
        query = """
        MATCH (f:Function {name: $function_name})-[:CALLS]->(callee:Function)
        RETURN callee.name AS name, callee.signature AS signature
        """
        return await Neo4jService.execute_query(query, {"function_name": function_name})

    @classmethod
    async def get_isolated_functions(cls) -> list[dict[str, Any]]:
        """Identifies functions with 0 callers/callees (potential dead code)."""
        query = """
        MATCH (f:Function)
        WHERE NOT (f)-[:CALLS]-()
        RETURN f.name AS name, f.docstring AS docstring
        """
        return await Neo4jService.execute_query(query)

    @classmethod
    async def get_transitive_impact(cls, module_name: str, depth: int = 3) -> list[dict[str, Any]]:
        """Perform a variable depth search to identify transitive impact graph for a module change."""
        query = f"""
        MATCH path = (affected:Module)-[:DEPENDS_ON*1..{depth}]->(m:Module {{name: $module_name}})
        RETURN affected.name AS affected_module, length(path) AS distance
        ORDER BY distance ASC
        """
        return await Neo4jService.execute_query(query, {"module_name": module_name})

    @classmethod
    async def get_project_graph_tree(cls, project_id: str) -> list[dict[str, Any]]:
        """Retrieves the complete hierarchical tree structure of the project from Neo4j, with MongoDB fallback."""
        
        def is_test_file(path: str) -> bool:
            if not path:
                return False
            path_lower = path.lower().replace("\\", "/")
            parts = path_lower.split("/")
            # Check if any parent folder is "tests" or "test"
            if any(p == "tests" or p == "test" for p in parts):
                return True
            # Check if the filename starts with "test_" or ends with "_test" (before extension)
            filename = parts[-1]
            name_no_ext = filename.rsplit(".", 1)[0]
            if name_no_ext.startswith("test_") or name_no_ext.endswith("_test"):
                return True
            return False

        def build_directory_tree(project_node: dict[str, Any], files_data: list[dict[str, Any]], bugs_by_func: dict[str, list[dict[str, Any]]]) -> None:
            # Build tree from files_data
            for file_info in files_data:
                path = file_info["path"].replace("\\", "/").strip("/")
                parts = path.split("/")
                if not parts:
                    continue
                    
                current_children = project_node["children"]
                current_path = ""
                
                for idx, part in enumerate(parts):
                    is_file = (idx == len(parts) - 1)
                    if current_path:
                        current_path = f"{current_path}/{part}"
                    else:
                        current_path = part
                        
                    if not is_file:
                        # Directory node
                        dir_node = None
                        for child in current_children:
                            if child["id"] == f"dir-{current_path}" and child["type"] == "folder":
                                dir_node = child
                                break
                        if not dir_node:
                            dir_node = {
                                "id": f"dir-{current_path}",
                                "label": part,
                                "type": "folder",
                                "children": []
                            }
                            current_children.append(dir_node)
                        current_children = dir_node["children"]
                    else:
                        # File node
                        file_node = {
                            "id": f"file-{current_path}",
                            "label": part,
                            "type": "file",
                            "children": []
                        }
                        
                        # Add classes
                        for cls in file_info["classes"]:
                            cls_node = {
                                "id": f"class-{current_path}-{cls['name']}",
                                "label": cls["name"],
                                "type": "class",
                                "children": []
                            }
                            
                            # Add methods
                            for method in cls["methods"]:
                                method_children = []
                                m_name = method["name"]
                                if m_name in bugs_by_func:
                                    method_children.extend(bugs_by_func[m_name])
                                    
                                method_node = {
                                    "id": f"func-{current_path}-{cls['name']}-{m_name}",
                                    "label": method["signature"],
                                    "type": "function"
                                }
                                if method_children:
                                    method_node["children"] = method_children
                                cls_node["children"].append(method_node)
                                
                            file_node["children"].append(cls_node)
                            
                        # Add module functions
                        for func in file_info["functions"]:
                            func_children = []
                            f_name = func["name"]
                            if f_name in bugs_by_func:
                                func_children.extend(bugs_by_func[f_name])
                                
                            func_node = {
                                "id": f"func-{current_path}-{f_name}",
                                "label": func["signature"],
                                "type": "function"
                            }
                            if func_children:
                                func_node["children"] = func_children
                            file_node["children"].append(func_node)
                            
                        # Add file-level bugs
                        for bug in file_info.get("bugs", []):
                            method_name = bug.get("method_name")
                            if not method_name or (method_name not in bugs_by_func):
                                file_node["children"].append({
                                    "id": f"bug-{bug['id']}",
                                    "label": f"Bug: {bug['severity']}",
                                    "type": "requirement"
                                })
                                
                        current_children.append(file_node)

        try:
            # 1. Fetch Project and structure details from Neo4j using new Directory/File nodes
            query = """
            MATCH (p:Project {id: $project_id})
            OPTIONAL MATCH (p)-[:EXPOSES_API]->(e:API)
            
            // Fetch Files and their Defined entities
            OPTIONAL MATCH (p)-[:CONTAINS*]->(f:File)
            OPTIONAL MATCH (f)-[:DEFINES]->(m:Module)
            OPTIONAL MATCH (f)-[:DEFINES]->(c:Class)
            OPTIONAL MATCH (c)-[:DEFINES]->(f1:Function)
            OPTIONAL MATCH (f)-[:DEFINES]->(f2:Function)
            
            RETURN 
                p.name AS project_name,
                f.path AS file_path, f.name AS file_name, f.language AS file_language,
                m.name AS module_name,
                c.name AS class_name, c.docstring AS class_docstring,
                f1.name AS class_func_name, f1.signature AS class_func_sig,
                f2.name AS mod_func_name, f2.signature AS mod_func_sig,
                e.method AS api_method, e.path AS api_path
            """
            rows = await Neo4jService.execute_query(query, {"project_id": project_id})
            
            # Fetch bugs separately, scoping the Function nodes to the specific project path.
            bug_query = """
            MATCH (p:Project {id: $project_id})-[:CONTAINS*]->(:File)-[:DEFINES*1..2]->(f:Function)
            MATCH (b:Bug)-[:LOCALIZED_IN]->(f)
            RETURN f.name AS function_name, b.id AS bug_id, b.severity AS severity
            """
            bug_rows = await Neo4jService.execute_query(bug_query, {"project_id": project_id})
            bugs_by_func: dict[str, list[dict[str, str]]] = {}
            for br in bug_rows:
                f_name = br["function_name"]
                if f_name not in bugs_by_func:
                    bugs_by_func[f_name] = []
                bugs_by_func[f_name].append({
                    "id": f"bug-{br['bug_id']}",
                    "label": f"Bug: {br['severity']}",
                    "type": "requirement"
                })
 
            if rows and any(r.get("file_path") or r.get("api_path") for r in rows):
                project_name = rows[0]["project_name"] or "Project"
                
                project_node: dict[str, Any] = {
                    "id": project_id,
                    "label": project_name,
                    "type": "project",
                    "children": []
                }
 
                files_map: dict[str, Any] = {}
                apis_set = set()
 
                for row in rows:
                    # API endpoint
                    api_method = row.get("api_method")
                    api_path = row.get("api_path")
                    if api_method and api_path:
                        api_key = f"{api_method} {api_path}"
                        if api_key not in apis_set:
                            apis_set.add(api_key)
                            project_node["children"].append({
                                "id": f"api-{api_key}",
                                "label": api_key,
                                "type": "api"
                            })
 
                    # File
                    file_path = row.get("file_path")
                    if not file_path:
                        continue
                        
                    if is_test_file(file_path):
                        continue
 
                    if file_path not in files_map:
                        files_map[file_path] = {
                            "path": file_path,
                            "classes": {},
                            "functions": []
                        }
 
                    file_entry = files_map[file_path]
 
                    # Class
                    class_name = row.get("class_name")
                    if class_name:
                        if class_name not in file_entry["classes"]:
                            file_entry["classes"][class_name] = {
                                "name": class_name,
                                "methods": []
                            }
                        
                        class_node = file_entry["classes"][class_name]
 
                        # Class function (method)
                        class_func = row.get("class_func_name")
                        if class_func:
                            class_func_sig = row.get("class_func_sig") or f"{class_func}()"
                            if not any(m["name"] == class_func for m in class_node["methods"]):
                                class_node["methods"].append({
                                    "name": class_func,
                                    "signature": class_func_sig
                                })
                    else:
                        # Module function (non-method)
                        mod_func = row.get("mod_func_name")
                        if mod_func:
                            mod_func_sig = row.get("mod_func_sig") or f"{mod_func}()"
                            if not any(f["name"] == mod_func for f in file_entry["functions"]):
                                file_entry["functions"].append({
                                    "name": mod_func,
                                    "signature": mod_func_sig
                                })
 
                # Convert files_map into nested directory tree
                files_data = []
                for f_path, f_info in files_map.items():
                    classes_list = []
                    for c_name, c_info in f_info["classes"].items():
                        classes_list.append({
                            "name": c_name,
                            "methods": c_info["methods"]
                        })
                    
                    files_data.append({
                        "path": f_path,
                        "classes": classes_list,
                        "functions": f_info["functions"],
                        "bugs": []
                    })
                    
                build_directory_tree(project_node, files_data, bugs_by_func)

                # Clean empty children list from leaf nodes
                def clean_children_dict(n):
                    if "children" in n:
                        if not n["children"]:
                            del n["children"]
                        else:
                            for c in n["children"]:
                                clean_children_dict(c)
                clean_children_dict(project_node)
                return [project_node]
        except Exception as e:
            logger.warning("neo4j_tree_query_failed_falling_back_to_mongo", error=str(e))
 
        # Fallback to MongoDB (100% dynamic, project-specific, no generic mock fallback data)
        from app.models.project import Project
        from app.models.source_file import SourceFile
        from app.models.code_entity import CodeEntity, EntityType
        from app.models.bug_report import BugReport
        from beanie import PydanticObjectId
 
        try:
            p_id = PydanticObjectId(project_id)
        except Exception:
            return []
 
        project = await Project.get(p_id)
        if not project:
            return []
 
        # Get actual project files, entities, tests, and bugs
        source_files = await SourceFile.find(SourceFile.project_id == p_id).to_list()
        code_entities = await CodeEntity.find(CodeEntity.project_id == p_id).to_list()
        bugs = await BugReport.find(BugReport.project_id == p_id).to_list()
 
        project_node = {
            "id": str(project.id),
            "label": project.name,
            "type": "project",
            "children": []
        }
 
        # Exclude test files
        source_files = [sf for sf in source_files if not is_test_file(sf.path)]
        
        # Pre-group code entities by file_id
        entities_by_file: dict[str, Any] = {}
        for ce in code_entities:
            f_id_str = str(ce.file_id)
            if f_id_str not in entities_by_file:
                entities_by_file[f_id_str] = []
            entities_by_file[f_id_str].append(ce)
            
        # Pre-group bugs by file path
        bugs_by_file: dict[str, Any] = {}
        for bug in bugs:
            if not bug.file_path:
                continue
            f_path_normalized = bug.file_path.replace("\\", "/").strip("/")
            if f_path_normalized not in bugs_by_file:
                bugs_by_file[f_path_normalized] = []
            bugs_by_file[f_path_normalized].append(bug)

        bugs_by_func = {}
        files_data = []

        # Resolve target directory for disk scanner — only use the project's recorded local_path.
        # Never fall back to a generic/hardcoded path so that unrelated codebases are never shown.
        import os
        target_dir = ""
        if project.local_path and os.path.exists(project.local_path):
            target_dir = project.local_path

        # Build a path-keyed index of MongoDB SourceFile records for enrichment
        source_file_by_path: dict[str, Any] = {}
        for sf in source_files:
            norm = sf.path.replace("\\", "/").strip("/")
            source_file_by_path[norm] = sf

        # ALWAYS scan the disk when local_path is available — this guarantees every
        # folder/file in the repo appears in the tree even before LLM ingestion compl        # If no disk path, fall back to MongoDB SourceFile records only.
        if target_dir:
            import re
            root_dir = target_dir
            file_limit_reached = False

            # All file types to show in the tree (exclude obvious binary/generated dirs)
            SHOW_EXTENSIONS = {
                ".py", ".ts", ".tsx", ".js", ".jsx", ".java", ".go", ".cs",
                ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".ini",
                ".cfg", ".env", ".sh", ".bat", ".dockerfile", ".html", ".css",
                ".rs", ".cpp", ".c", ".h", ".rb", ".php", ".swift", ".kt",
            }
            CODE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".java", ".go", ".cs", ".rs", ".cpp", ".c", ".rb"}

            for r, dirs, files in os.walk(root_dir):
                if file_limit_reached:
                    break
                dirs[:] = sorted([
                    d for d in dirs
                    if d not in (".git", "__pycache__", "node_modules", ".venv", "venv", "dist", "build", ".next", ".pytest_cache", "*.egg-info")
                    and not d.startswith(".")
                ])
                for f in sorted(files):
                    ext = os.path.splitext(f)[1].lower()
                    if ext not in SHOW_EXTENSIONS and "dockerfile" not in f.lower():
                        continue

                    full_f = os.path.join(r, f)
                    rel_f = os.path.relpath(full_f, root_dir).replace("\\", "/")

                    if is_test_file(rel_f):
                        continue

                    mod_funcs: list[dict] = []
                    mod_classes: list[dict] = []

                    # Check if MongoDB has richer entity info for this file
                    sf_record = source_file_by_path.get(rel_f)
                    if sf_record and entities_by_file.get(str(sf_record.id)):
                        file_entities = entities_by_file[str(sf_record.id)]
                        classes_ents = [e for e in file_entities if e.entity_type == EntityType.CLASS]
                        for cls_e in classes_ents:
                            cls_prefix = f"{cls_e.qualified_name}."
                            meth_ents = [
                                e for e in file_entities
                                if e.entity_type in (EntityType.FUNCTION, EntityType.METHOD)
                                and e.qualified_name.startswith(cls_prefix)
                            ]
                            mod_classes.append({
                                "name": cls_e.name,
                                "methods": [{"name": m.name, "signature": f"{m.name}()"} for m in meth_ents],
                                "bugs": [],
                            })
                        cls_prefixes = [f"{c.qualified_name}." for c in classes_ents]
                        for fn_e in file_entities:
                            if fn_e.entity_type in (EntityType.FUNCTION, EntityType.METHOD):
                                if not any(fn_e.qualified_name.startswith(p) for p in cls_prefixes):
                                    mod_funcs.append({"name": fn_e.name, "signature": f"{fn_e.name}()"})
                    elif ext in CODE_EXTENSIONS:
                        # Fast AST/regex parse for enrichment when no MongoDB data
                        try:
                            content = open(full_f, "r", encoding="utf-8", errors="ignore").read()
                            if ext == ".py":
                                import ast as _ast
                                _tree = _ast.parse(content)
                                for item in _tree.body:
                                    if isinstance(item, _ast.FunctionDef):
                                        mod_funcs.append({"name": item.name, "signature": f"{item.name}()"})
                                    elif isinstance(item, _ast.ClassDef):
                                        methods = [
                                            {"name": n.name, "signature": f"{n.name}()"}
                                            for n in item.body if isinstance(n, _ast.FunctionDef)
                                        ]
                                        mod_classes.append({"name": item.name, "methods": methods, "bugs": []})
                            else:
                                for fn_name in re.findall(r"(?:function|const|let)\s+([a-zA-Z0-9_]+)\s*=", content):
                                    mod_funcs.append({"name": fn_name, "signature": f"{fn_name}()"})
                        except Exception:
                            pass

                    # Add bug annotations from MongoDB
                    file_bugs_list = bugs_by_file.get(rel_f, [])
                    bug_annotations: list[dict] = []
                    for bug in file_bugs_list:
                        bug_annotations.append({
                            "id": str(bug.id),
                            "severity": bug.severity,
                            "method_name": bug.method_name or "",
                        })
                        if bug.method_name:
                            bugs_by_func.setdefault(bug.method_name, []).append({
                                "id": f"bug-{bug.id}",
                                "label": f"Bug: {bug.severity}",
                                "type": "requirement",
                            })

                    files_data.append({
                        "path": rel_f,
                        "classes": mod_classes,
                        "functions": mod_funcs[:15],
                        "bugs": bug_annotations,
                    })

                    if len(files_data) >= 500:
                        file_limit_reached = True
                        break

        elif source_files:
            # No disk path available — build tree from MongoDB SourceFile records only
            for sf in source_files:
                sf_path_normalized = sf.path.replace("\\", "/").strip("/")
                file_entities = entities_by_file.get(str(sf.id), [])
                file_bugs_list = bugs_by_file.get(sf_path_normalized, [])

                classes = []
                classes_entities = [e for e in file_entities if e.entity_type == EntityType.CLASS]
                for cls_ce in classes_entities:
                    cls_prefix = f"{cls_ce.qualified_name}."
                    method_entities = [
                        e for e in file_entities
                        if e.entity_type in (EntityType.FUNCTION, EntityType.METHOD)
                        and e.qualified_name.startswith(cls_prefix)
                    ]
                    class_bugs: list[dict] = []
                    for bug in file_bugs_list:
                        if bug.class_name == cls_ce.name:
                            class_bugs.append({"id": str(bug.id), "severity": bug.severity, "method_name": bug.method_name})
                            if bug.method_name:
                                bugs_by_func.setdefault(bug.method_name, []).append({
                                    "id": f"bug-{bug.id}",
                                    "label": f"Bug: {bug.severity}",
                                    "type": "requirement",
                                })
                    classes.append({
                        "name": cls_ce.name,
                        "methods": [{"name": m.name, "signature": f"{m.name}()"} for m in method_entities],
                        "bugs": class_bugs,
                    })

                class_prefixes = [f"{c.qualified_name}." for c in classes_entities]
                mod_funcs = [
                    {"name": e.name, "signature": f"{e.name}()"}
                    for e in file_entities
                    if e.entity_type in (EntityType.FUNCTION, EntityType.METHOD)
                    and not any(e.qualified_name.startswith(p) for p in class_prefixes)
                ]
                mod_bugs: list[dict] = []
                for bug in file_bugs_list:
                    if not bug.class_name:
                        mod_bugs.append({"id": str(bug.id), "severity": bug.severity, "method_name": bug.method_name})
                        if bug.method_name:
                            bugs_by_func.setdefault(bug.method_name, []).append({
                                "id": f"bug-{bug.id}",
                                "label": f"Bug: {bug.severity}",
                                "type": "requirement",
                            })

                files_data.append({
                    "path": sf.path,
                    "classes": classes,
                    "functions": mod_funcs,
                    "bugs": mod_bugs,
                })

        # Build directory tree structure under project_node
        build_directory_tree(project_node, files_data, bugs_by_func)
 
        # Map APIs
        api_endpoints = []
        if project.config and "api_endpoints" in project.config:
            api_endpoints = project.config["api_endpoints"]
        elif getattr(project, "api_endpoints", None):
            api_endpoints = project.api_endpoints
            
        for ep in api_endpoints:
            method = ep.get("method", "GET")
            path = ep.get("path", "")
            label = f"{method} {path}"
            project_node["children"].append({
                "id": f"api-{method}-{path}",
                "label": label,
                "type": "api"
            })
 
        # Clean empty children lists from leaf nodes
        def clean_children(node):
            if "children" in node:
                if not node["children"]:
                    del node["children"]
                else:
                    for child in node["children"]:
                        clean_children(child)
        
        clean_children(project_node)
        return [project_node]
