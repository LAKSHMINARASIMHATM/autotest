"use client";

import { useState } from "react";
import { FlaskConical, FileCode, CheckCircle2, Play, RefreshCw, Code2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

interface TestCase {
  id: string;
  name: string;
  file: string;
  assertions: number;
  confidence: number;
  passRate: number;
  code: string;
  framework: string;
}

const mockTestCases: TestCase[] = [
  {
    id: "tc_1",
    name: "test_jwt_login_successful",
    file: "tests/unit/test_auth.py",
    assertions: 5,
    confidence: 0.94,
    passRate: 100,
    framework: "pytest",
    code: `def test_jwt_login_successful(client, test_user):
    # Arrange
    payload = {"email": test_user.email, "password": "securepassword"}
    
    # Act
    response = client.post("/api/v1/auth/login", json=payload)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "role" in data`,
  },
  {
    id: "tc_2",
    name: "test_jwt_token_expiration",
    file: "tests/unit/test_auth.py",
    assertions: 3,
    confidence: 0.88,
    passRate: 100,
    framework: "pytest",
    code: `def test_jwt_token_expiration(client, test_user):
    # Act & Assert
    token = create_access_token(test_user.email, expires_delta=timedelta(seconds=-1))
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/projects", headers=headers)
    assert response.status_code == 401
    assert "token expired" in response.json()["detail"].lower()`,
  },
  {
    id: "tc_3",
    name: "test_create_project_invalid_url",
    file: "tests/integration/test_projects.py",
    assertions: 4,
    confidence: 0.91,
    passRate: 94.2,
    framework: "pytest",
    code: `def test_create_project_invalid_url(client, auth_headers):
    # Arrange
    invalid_payload = {"name": "Test Project", "repo_url": "not-a-valid-url"}
    
    # Act
    response = client.post("/api/v1/projects", json=invalid_payload, headers=auth_headers)
    
    # Assert
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(err["loc"][-1] == "repo_url" for err in errors)`,
  },
];

export default function TestsPage() {
  const [selectedCase, setSelectedCase] = useState<TestCase>(mockTestCases[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  const triggerGeneration = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Test</span> Suites
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            View generated test scripts, assertion distributions, and confidence ratings.
          </p>
        </div>
        <Button onClick={triggerGeneration} disabled={isGenerating} className="gap-2 text-[13px] font-semibold">
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Code2 className="w-4 h-4" /> Generate Test Suite
            </>
          )}
        </Button>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: test file list */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Generated Tests</h3>
            <div className="space-y-1">
              {mockTestCases.map((tc) => (
                <button
                  key={tc.id}
                  onClick={() => setSelectedCase(tc)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    selectedCase.id === tc.id
                      ? "bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.2)] text-[#3B82F6]"
                      : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedCase.id === tc.id ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "bg-[rgba(255,255,255,0.06)] text-[#6B7280]"
                  }`}>
                    <FileCode className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{tc.name}</p>
                    <p className="text-[11px] text-[#6B7280] font-mono truncate">{tc.file}</p>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Test statistics card */}
          <GlassCard className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Suite Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-[#6B7280] block">Asserts Count</span>
                <span className="text-lg font-bold text-[#F9FAFB]">{selectedCase.assertions}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B7280] block">Confidence</span>
                <span className="text-lg font-bold text-[#F9FAFB]">{(selectedCase.confidence * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B7280] block">Pass Rate</span>
                <span className="text-lg font-bold text-[#10B981]">{selectedCase.passRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B7280] block">Framework</span>
                <span className="text-lg font-bold text-[#F59E0B] font-mono uppercase">{selectedCase.framework}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right column: test code viewer */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
              <div>
                <h3 className="text-base font-semibold text-[#F9FAFB]">{selectedCase.name}</h3>
                <span className="text-xs font-mono text-[#6B7280]">{selectedCase.file}</span>
              </div>
              <Button size="sm" className="gap-1.5 text-xs">
                <Play className="w-3.5 h-3.5" /> Run Case
              </Button>
            </div>

            <div className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-[12px] leading-relaxed overflow-x-auto text-[#9CA3AF]">
              {selectedCase.code.split("\n").map((line, idx) => (
                <div key={idx} className="table-row">
                  <span className="table-cell text-right pr-4 select-none opacity-20 text-xs w-6">{idx + 1}</span>
                  <span className="table-cell">{line || " "}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
