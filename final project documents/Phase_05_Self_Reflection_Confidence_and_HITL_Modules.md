# Phase 5: Self-Reflection Mechanism, Confidence Module & HITL Subsystem

---

## 1. Self-Reflection Mechanism

### 1.1 Overview & Purpose
Monolithic code generation models suffer from single-pass hallucination. The **Self-Reflection Mechanism** introduces an internal feedback loop where agents evaluate their candidate outputs against compiler diagnostics, static verification, and sandboxed test execution telemetry before yielding a final response.

```
+-------------------------------------------------------------------------------+
|                           SELF-REFLECTION ITERATION LOOP                      |
|                                                                               |
|  +-------------------+      +--------------------+      +------------------+  |
|  | Candidate Output  | ---> | Sandboxed Exec /   | ---> | Error Diagnosis  |  |
|  |  (Code / Patch)   |      | Static Verifier    |      | & Trace Parsing  |  |
|  +-------------------+      +--------------------+      +------------------+  |
|            ^                                                     |            |
|            |                Mutated Prompt Context               |            |
|            +-----------------------------------------------------+            |
+-------------------------------------------------------------------------------+
```

### 1.2 Iterative Reflection Process
1. **Initial Generation**: Agent generates candidate test code $T_0$ or repair patch $P_0$.
2. **Verification & Execution Evaluation**: $T_0$ is evaluated statically (Agent 06) and executed (Agent 07).
3. **Traceback Analysis**: If syntax or execution errors occur, the exact traceback, missing imports, or assertion failures are captured into `error_feedback`.
4. **Prompt Mutation & Self-Correction**: The agent constructs a revised prompt containing:
   - Original source code
   - Previously generated failing candidate output ($T_i$)
   - Complete compiler error log / stack trace
   - Specific correction directive ("Fix line 14: TypeError: expected int got str")
5. **Regeneration**: Agent outputs refined candidate $T_{i+1}$.
6. **Termination Condition**: Iteration halts when test execution passes ($100\%$ success) or iteration count reaches $N_{max\_retry} = 3$.

---

## 2. Confidence-Based Decision Module

### 2.1 Mathematical Formulation of Confidence Score $C$
AutoTestAI computes a composite confidence score $C \in [0.0, 1.0]$ for every generated test suite and candidate repair patch.

$$C = w_1 \cdot S_{syntax} + w_2 \cdot S_{compile} + w_3 \cdot S_{pass} + w_4 \cdot S_{cov} + w_5 \cdot S_{regress}$$

Where the weights are constrained by:
$$\sum_{i=1}^{5} w_i = 1.0 \quad \text{with } w_1=0.15, \, w_2=0.20, \, w_3=0.35, \, w_4=0.15, \, w_5=0.15$$

#### Sub-Metric Calculations:
1. **Syntax Correctness Score ($S_{syntax}$)**:
   $$S_{syntax} = \begin{cases} 1.0 & \text{if AST parsing succeeds with 0 errors} \\ 0.0 & \text{if syntax errors are present} \end{cases}$$

2. **Compilation / Import Score ($S_{compile}$)**:
   $$S_{compile} = \begin{cases} 1.0 & \text{if test environment imports resolve} \\ 0.5 & \text{if missing 3rd-party non-critical package} \\ 0.0 & \text{if target module cannot be imported} \end{cases}$$

3. **Test Assertion Pass Rate ($S_{pass}$)**:
   $$S_{pass} = \frac{N_{passed}}{N_{total\_executed}}$$

4. **Line & Branch Coverage Score ($S_{cov}$)**:
   $$S_{cov} = 0.6 \cdot \left(\frac{\text{Line Coverage \%}}{100}\right) + 0.4 \cdot \left(\frac{\text{Branch Coverage \%}}{100}\right)$$

5. **Regression Pass Score ($S_{regress}$)**:
   $$S_{regress} = \frac{N_{pre\_existing\_passing}}{N_{total\_pre\_existing}}$$

---

### 2.2 Threshold Decision Matrix

| Confidence Range ($C$) | System Action | Rationale |
| :--- | :--- | :--- |
| **$C \ge 0.85$** | **ACCEPT & AUTO-COMMIT** | High structural, execution, and coverage confidence. No human intervention required. |
| **$0.70 \le C < 0.85$** | **SELF-REFLECT & RETRY** | Moderate confidence. Output contains fixable execution or coverage flaws. |
| **$C < 0.70$** | **ESCALATE TO HITL QUEUE** | Low confidence / high risk. Requires manual review by developer. |
| **$N_{retry} \ge 3$** | **FORCE HITL ESCALATION** | Max retries exhausted without reaching target threshold. |

---

### 2.3 Decision Logic Tree

```
                      [Compute Confidence Score C]
                                   |
                +------------------+------------------+
                |                                     |
           C >= 0.85                             C < 0.85
                |                                     |
                v                                     v
       [Auto-Accept Output]                  [Check Iteration Count]
                |                                     |
         (Save to DB &                        +-------+-------+
          Return HTTP 200)                    |               |
                                        Count < 3         Count >= 3
                                              |               |
                                              v               v
                                     [Trigger Reflection]  [Escalate HITL]
                                              |               |
                                      (Mutate Prompt &   (Enqueue to
                                       Retry Agent Node)  Reviewer Queue)
```

---

## 3. Human-in-the-Loop (HITL) Subsystem

### 3.1 Reviewer Interface Specification
When an agent output is flagged for HITL escalation, it enters the **HITL Reviewer Dashboard**.

#### Interface Components:
1. **Side-by-Side Unified Code Diff Viewer**: Displays original vs. generated code/patch with syntax highlighting.
2. **Execution Diagnostic Panel**: Shows terminal output, exact PyTest failure logs, and SBFL suspect line highlights.
3. **Confidence Metric Breakdown**: Displays $C_{score}$ sub-metrics ($S_{syntax}, S_{compile}, S_{pass}, S_{cov}, S_{regress}$).
4. **Interactive Guidance Console**: Allows reviewer to type custom hints (e.g., *"Mock the database call on line 22 using pytest-mock"*).
5. **Action Buttons**: `[Approve Patch]`, `[Reject Patch]`, `[Modify & Re-Run]`, `[Escalate to Senior Dev]`.

---

### 3.2 Approval & Rejection Workflows

#### Approval Workflow:
```
[HITL Queue Item] --> Developer Reviews Diff & Logs --> Clicks [Approve]
                                                               |
                                                               v
                                                    System Updates DB Status 
                                                    ("HITL_APPROVED")
                                                               |
                                                               v
                                                    Apply Code Patch / Test 
                                                    to Main Branch
```

#### Rejection & Feedback Loop Workflow:
```
[HITL Queue Item] --> Developer Clicks [Reject] --> Enters Rejection Reason / Guidance
                                                               |
                                                               v
                                                    System Stores Reviewer Feedback 
                                                    in HITLReviews Collection
                                                               |
                                                               v
                                                    Injects Human Feedback into 
                                                    Agent Memory & Re-Triggers Generation
```

---

### 3.3 Feedback Storage & Audit Trail Schema
All HITL interactions are recorded in MongoDB to facilitate auditability and fine-tuning:

```json
{
  "_id": "66a0f18c9b1d2e3f4a5b6c7d",
  "project_id": "66a0f1009b1d2e3f4a5b6c00",
  "execution_id": "66a0f1559b1d2e3f4a5b6c11",
  "agent_name": "ProgramRepairAgent",
  "confidence_score": 0.62,
  "failure_reason": "Regression test failed on test_user_auth.py",
  "reviewer_id": "usr_998231",
  "reviewer_action": "REJECTED_WITH_FEEDBACK",
  "reviewer_feedback": "Do not modify the password hash algorithm; handle null hash in auth_service.py instead.",
  "original_code_snippet": "if not hash: return False",
  "proposed_patch_diff": "--- a/auth.py\n+++ b/auth.py\n@@ -12,3 +12,3 @@\n-if not hash:\n+if hash is None:",
  "timestamp": "2026-07-25T18:30:00Z"
}
```
