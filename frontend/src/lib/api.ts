/**
 * api.ts — central fetch client for the AutoTestAI backend.
 * All pages should import helpers from here — no direct fetch calls.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// First project id from the project list is stored here after first call
let _cachedProjectId: string | null = null;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> ?? {}),
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  repo_url: string;
  language: string;
  framework: string;
  branch: string;
  status: string;
  total_files: number;
  total_test_cases: number;
  total_bugs_found: number;
  total_patches_applied: number;
  coverage_percentage: number;
  local_path?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: ProjectItem[];
  total: number;
  page: number;
  page_size: number;
}

export async function listProjects(page = 1, pageSize = 20): Promise<ProjectListResponse> {
  return request<ProjectListResponse>(`/projects?page=${page}&page_size=${pageSize}`);
}

/** Returns the first project id — used as a default when no project is selected. */
export async function getDefaultProjectId(): Promise<string | null> {
  if (_cachedProjectId) return _cachedProjectId;
  try {
    const res = await listProjects();
    _cachedProjectId = res.items[0]?.id ?? null;
    return _cachedProjectId;
  } catch {
    return null;
  }
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  project_id: string;
  total_test_cases: number;
  total_runs: number;
  latest_run: {
    passed: number;
    failed: number;
    total: number;
    pass_rate: number;
    coverage_pct: number;
  };
  total_bugs: number;
  total_patches: number;
  patch_success_rate: number;
  agents_executed: number;
}

export async function getDashboardMetrics(projectId: string): Promise<DashboardMetrics> {
  return request<DashboardMetrics>(`/metrics/dashboard/${projectId}`);
}

export interface CoveragePoint {
  run_id: string;
  coverage: number;
  passed: number;
  failed: number;
}

export async function getCoverageTrend(projectId: string, limit = 10): Promise<CoveragePoint[]> {
  return request<CoveragePoint[]>(`/metrics/coverage/${projectId}?limit=${limit}`);
}

export interface BugSeverityDist {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export async function getBugSeverityDist(projectId: string): Promise<BugSeverityDist> {
  return request<BugSeverityDist>(`/metrics/bugs/${projectId}/severity`);
}

export interface PatchStrategyBreakdown {
  [strategy: string]: number;
}

export async function getPatchStrategyBreakdown(projectId: string): Promise<PatchStrategyBreakdown> {
  return request<PatchStrategyBreakdown>(`/metrics/patches/${projectId}/strategies`);
}

// ─── Test Cases ──────────────────────────────────────────────────────────────

export interface TestCaseItem {
  id: string;
  name: string;
  file: string;
  assertions: number;
  confidence: number;
  pass_rate: number;
  code: string;
  framework: string;
}

export async function getProjectTestCases(projectId: string): Promise<TestCaseItem[]> {
  return request<TestCaseItem[]>(`/projects/${projectId}/test-cases`);
}

// ─── Bugs ────────────────────────────────────────────────────────────────────

export interface BugItem {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  method: string;
  line: number;
  confidence: number;
  status: string;
  rootCause: string;
  codeSnippet: string;
  fixSuggestion: string;
}

export async function getProjectBugs(projectId: string): Promise<BugItem[]> {
  return request<BugItem[]>(`/projects/${projectId}/bugs`);
}

// ─── Patches ─────────────────────────────────────────────────────────────────

export interface PatchItem {
  id: string;
  bugId: string;
  strategy: string;
  status: string;
  confidence: number;
  file: string;
  diff: string;
  timestamp: string;
}

export async function getProjectPatches(projectId: string): Promise<PatchItem[]> {
  return request<PatchItem[]>(`/projects/${projectId}/patches`);
}

export interface GeneratePatchRequest {
  bug_id: string;
  file_path: string;
  method_name: string;
  buggy_code: string;
  error_message: string;
  root_cause: string;
  strategies?: string[];
}

export async function generatePatches(payload: GeneratePatchRequest): Promise<PatchItem[]> {
  return request<PatchItem[]>("/repair/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface ApprovePatchResponse {
  status: string;
  patch_id: string;
  commit_sha?: string;
  commit_message?: string;
  message: string;
}

export async function approvePatch(patchId: string): Promise<ApprovePatchResponse> {
  return request<ApprovePatchResponse>(`/repair/approve/${patchId}`, {
    method: "POST",
  });
}

export async function rejectPatch(patchId: string): Promise<{ status: string; patch_id: string; message: string }> {
  return request<{ status: string; patch_id: string; message: string }>(`/repair/reject/${patchId}`, {
    method: "POST",
  });
}


// ─── Knowledge Graph / Cypher ────────────────────────────────────────────────

export async function executeCypherQuery(query: string): Promise<unknown> {
  return request<unknown>("/graph/query", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

// ─── GitHub Import ────────────────────────────────────────────────────────────

export interface GitHubImportRequest {
  repo_url: string;
  name?: string;
  branch?: string;
  language?: string;
  description?: string;
  auto_run_agents?: boolean;
}

export interface GitHubImportResponse {
  project_id: string;
  name: string;
  repo_url: string;
  language: string;
  framework: string;
  total_files: number;
  total_functions: number;
  total_classes: number;
  api_endpoints: { method: string; path: string }[];
  session_id: string | null;
  pipeline_status: string;
}

export async function importFromGitHub(payload: GitHubImportRequest): Promise<GitHubImportResponse> {
  return request<GitHubImportResponse>("/projects/import/github", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function importFromZip(formData: FormData): Promise<GitHubImportResponse> {
  const res = await fetch(`${BASE}/projects/import/zip`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<GitHubImportResponse>;
}

// ─── Agent Pipeline ──────────────────────────────────────────────────────────

export interface PipelineStatusResponse {
  session_id: string;
  project_id: string;
  status: string;
  agents_run: string[];
  test_cases_generated: number;
  bugs_found: number;
  patches_generated: number;
}

export async function triggerAgentPipeline(projectId: string, maxIterations = 2) {
  return request<{ session_id: string; status: string; message: string }>("/agents/trigger", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, max_iterations: maxIterations }),
  });
}

/** Fast 5-agent pipeline: Planner→Requirement→Architecture→TestStrategy→TestGeneration only. */
export async function generateTests(projectId: string) {
  return request<{ session_id: string; status: string; message: string }>(
    `/agents/generate-tests/${projectId}`,
    { method: "POST" }
  );
}

export async function getPipelineStatus(sessionId: string): Promise<PipelineStatusResponse> {
  return request<PipelineStatusResponse>(`/agents/status/${sessionId}`);
}

export async function listPipelineSessions(): Promise<PipelineStatusResponse[]> {
  return request<PipelineStatusResponse[]>("/agents/sessions");
}

export interface ExecuteTestsResponse {
  run_id: string;
  framework: string;
  passed: number;
  failed: number;
  errors: number;
  total: number;
  duration_ms: number;
  coverage_pct: number;
  exit_code?: number;
  failures: { node_id: string; longrepr?: string; name?: string; message?: string }[];
  logs: string;
}

export async function executeTests(
  projectId: string,
  framework = "pytest",
  projectPath = ""
): Promise<ExecuteTestsResponse> {
  return request<ExecuteTestsResponse>("/execution/run", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      framework,
      project_path: projectPath,
    }),
  });
}

export interface RegressionResponse {
  ok: boolean;
  passed: number;
  failed: number;
  delta: number;
  message: string;
  logs: string;
}

export async function runRegression(
  projectPath: string,
  baselinePassed = 0
): Promise<RegressionResponse> {
  return request<RegressionResponse>("/repair/regression", {
    method: "POST",
    body: JSON.stringify({
      project_path: projectPath,
      baseline_passed: baselinePassed,
    }),
  });
}

export async function scanBugs(projectId: string): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>(`/projects/${projectId}/scan-bugs`, {
    method: "POST",
  });
}

// ─── Authentication ──────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  full_name?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export async function loginUser(payload: LoginPayload): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerUser(payload: RegisterPayload): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<UserResponse> {
  return request<UserResponse>("/auth/me");
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKeyItem {
  id: string;
  name: string;
  token: string;
  key_prefix: string;
  role: string;
  created: string;
}

export async function listApiKeys(): Promise<ApiKeyItem[]> {
  return request<ApiKeyItem[]>("/auth/api-keys");
}

export async function createApiKey(name: string, role: string): Promise<ApiKeyItem> {
  return request<ApiKeyItem>("/auth/api-keys", {
    method: "POST",
    body: JSON.stringify({ name, role }),
  });
}

export async function revokeApiKey(keyId: string): Promise<void> {
  // DELETE returns 204 no content
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/auth/api-keys/${keyId}`, { method: "DELETE", headers });
  if (!res.ok && res.status !== 204) {
    throw new Error(`API ${res.status}`);
  }
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  timestamp: string;
}

export async function getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  return request<AuditLogEntry[]>(`/auth/audit-log?limit=${limit}`);
}

// ─── Monitoring Health ────────────────────────────────────────────────────────

export interface MonitoringHealth {
  uptime_seconds: number;
  host: {
    cpu_pct: number;
    ram_used_mb: number;
    ram_total_mb: number;
    ram_pct: number;
  };
  database: {
    mongodb: Record<string, number>;
    neo4j_status: string;
    neo4j_nodes: number;
  };
  pipeline: {
    total_sessions: number;
    recent_sessions: {
      session_id: string;
      project_id: string;
      status: string;
      agents_run: string[];
      test_cases_generated: number;
      bugs_found: number;
      patches_generated: number;
    }[];
  };
}

export async function getMonitoringHealth(): Promise<MonitoringHealth> {
  return request<MonitoringHealth>("/monitoring/health");
}

// ─── Knowledge Graph ──────────────────────────────────────────────────────────

export async function getProjectGraphTree(projectId: string): Promise<unknown[]> {
  return request<unknown[]>(`/graph/projects/${projectId}/tree`);
}

export async function indexGraph(projectId: string): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>(`/projects/${projectId}/index-graph`, {
    method: "POST",
  });
}
