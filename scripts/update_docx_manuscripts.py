import docx
import sys
import os

def update_docx(docx_path):
    print(f"Updating DOCX at: {docx_path}")
    doc = docx.Document(docx_path)

    # 1. Update Paragraphs
    for i, p in enumerate(doc.paragraphs):
        txt = p.text.strip()

        # P17: Repair accuracy -> repair success rate
        if "Empirical benchmark evaluation: we conduct an extensive" in txt:
            p.text = "5) Empirical benchmark evaluation: we conduct an extensive experimental evaluation across 155 real-world open-source defects, demonstrating measurable improvements over existing baselines in coverage, compilation rate, and repair success rate."
            print(f"Updated P{i}: Empirical benchmark evaluation text")

        # P25: proving that -> demonstrating that
        if "proving that decomposed prompts outperform monolithic models" in txt:
            p.text = txt.replace("proving that decomposed prompts outperform monolithic models", "demonstrating that decomposed prompts outperform monolithic models")
            print(f"Updated P{i}: Softened 'proving' to 'demonstrating'")

        # P71: Implementation validation paragraph
        if "In addition to the 155-defect academic benchmark, the supplied software-validation record reports" in txt:
            p.text = ("The implementation was additionally validated through 26 backend tests, including 18 core "
                      "unit/sandbox tests and 8 API integration tests, all of which passed. The program-repair sandbox "
                      "successfully generated and validated a minimal patch for an arithmetic defect (return a - b → return a + b), "
                      "confirming compilation, failing-test recovery, regression containment (100%), and coverage maintenance. "
                      "The frontend completed TypeScript type checking with 0 errors and production build validation across 17 static routes "
                      "in 8.8 seconds. These operational verification metrics certify the live execution readiness of the system "
                      "and are maintained distinct from the 155-defect empirical research evaluation.")
            print(f"Updated P{i}: Implementation validation paragraph")

        # P79: Benchmark Datasets & Reproducibility
        if "AutoTestAI was evaluated across four recognized software-engineering benchmarks comprising 155 total open-source defects, summarized in Table V." in txt:
            p.text = ("AutoTestAI was evaluated across four recognized software-engineering benchmarks comprising 155 total "
                      "open-source defects, summarized in Table V. To ensure complete experimental reproducibility, the raw benchmark dataset "
                      "is cataloged in data/benchmark_155_defects_raw.csv and data/benchmark_155_defects_raw.json. This repository artifact "
                      "specifies the exact defect IDs, source project names, commit hashes, target functions, repair strategies, compilation outcomes, "
                      "line/branch coverages, Top-1/Top-5 SBFL localization rankings, and execution latencies. Model evaluations used GPT-4o "
                      "(temperature T = 0.2, top-p = 0.95, seed fixed across 3 trials) with a reflection retry budget of N_max_retry = 3.")
            print(f"Updated P{i}: Benchmark datasets and reproducibility paragraph")

        # P88: Evaluation metrics latency definition
        if "where M_gen, M_comp, and M_repair denote test-generation success rate" in txt:
            p.text = ("where M_gen, M_comp, and M_repair denote test-generation success rate, compilation success rate, "
                      "and repair success rate; M_acc@K denotes top-K bug-localization accuracy; and Expected Calibration Error (ECE) "
                      "measures how closely the confidence score C tracks true empirical pass rate across probability bins B_m. "
                      "To prevent metric ambiguity, we explicitly distinguish End-to-End Pipeline Latency (L_e2e = 28.6 s), "
                      "defined as the wall-clock duration of the complete 14-agent cycle on a defect (including AST parsing, "
                      "test generation, sandboxed execution, SBFL localization, patch generation, patch validation, and regression testing), "
                      "from the Mean Agent Module Execution Runtime (T_agent = 14.8 s), which measures isolated single-agent module execution without downstream repair.")
            print(f"Updated P{i}: Metrics definition with explicit L_e2e and T_agent distinctions")

        # P102: Ablation study text
        if "Removing self-reflection reduces compilation success by 17.8 points" in txt:
            p.text = ("The ablation results indicate that iterative traceback-guided self-correction makes a substantial "
                      "contribution to compilation and repair performance. Specifically, removing self-reflection reduces compilation success "
                      "by 17.8 percentage points and repair success rate by 27.3 percentage points, confirming that iterative traceback analysis "
                      "is central to resolving LLM syntax and logic errors. Disabling the confidence module more than quadruples the Expected "
                      "Calibration Error (0.194 vs. 0.042), allowing uncalibrated patches to bypass governance. Collapsing the 14 specialized "
                      "agents into a single monolithic prompt causes the largest degradation, dropping line coverage from 89.4% to 64.2%—indicating "
                      "that role specialization, not merely execution feedback, is the dominant architectural contributor to AutoTestAI's performance.")
            print(f"Updated P{i}: Ablation study text with scientific phrasing")

    # 2. Update Table VI (Table 8 in docx)
    tbl6 = doc.tables[8]
    # Check headers
    hdr_cells = tbl6.rows[0].cells
    for c in hdr_cells:
        if "Repair Acc." in c.text:
            c.text = "Repair Success Rate (%)"
            print("Updated Table VI header: Repair Success Rate (%)")
        if "Latency (s)" in c.text:
            c.text = "E2E Pipeline Latency (s)"
            print("Updated Table VI header: E2E Pipeline Latency (s)")

    # 3. Format font for any changed paragraphs
    for p in doc.paragraphs:
        for r in p.runs:
            if not r.font.name:
                r.font.name = 'Times New Roman'

    doc.save(docx_path)
    print(f"Successfully saved updated DOCX: {docx_path}")

if __name__ == '__main__':
    doc1 = r"d:\autotest\AutoTestAI_IEEE_Paper_IEEE_Ready_Updated.docx"
    doc2 = r"d:\autotest\final project documents\AutoTestAI_IEEE_Research_Paper_MultiFramework.docx"
    update_docx(doc1)
    if os.path.exists(doc2):
        update_docx(doc2)
