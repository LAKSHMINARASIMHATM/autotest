# Threats to Validity & Limitations

This document outlines the methodological boundaries, potential biases, and threats to validity for the empirical evaluation of AutoTestAI.

## 1. Threats to Internal Validity
- **Non-Determinism of Large Language Models:** LLM inference exhibits stochasticity even at low temperature settings ($T=0.2$). To mitigate this, runs are evaluated across 3 distinct random seeds (42, 123, 999), and results are reported with standard deviations.
- **Flaky Tests:** Certain network- or timing-dependent tests in open-source projects may fail intermittently. The sandbox uses timeout guards and test retries to distinguish flakiness from true functional failures.

## 2. Threats to External Validity
- **Programming Language Generalization:** While AutoTestAI's architecture is language-agnostic, the current experimental harness focuses on Python codebases using PyTest and AST parsing. Generalization to compiled languages (e.g. Java, C++) requires language-specific compiler sandboxes.
- **Defect Distribution:** BugsInPy represents real defects in popular Python projects, but real-world enterprise codebases may exhibit different defect patterns, such as distributed concurrency or infrastructure-level misconfigurations.

## 3. Data Contamination
- **LLM Training Cutoff:** Public GitHub repositories in BugsInPy were published prior to the training cutoff of contemporary LLMs (Llama-3, GPT-4). The model may have encountered parts of these repositories during pretraining.
- **Mitigation:** We evaluate not only patch synthesis but also step-by-step fault localization, AST verification, and multi-iteration self-reflection loops that cannot be memorized as static code snippets.
