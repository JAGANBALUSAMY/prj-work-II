import os
import sys
import json
import asyncio

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.services.vulnerability_service import vulnerability_service

async def run_benchmark():
    print("=== Vulnerability Intelligence Benchmark ===")
    
    # 1. Create a dummy node project with vulnerabilities
    test_dir = os.path.abspath("test_security_repo")
    os.makedirs(test_dir, exist_ok=True)
    
    with open(os.path.join(test_dir, "package.json"), "w") as f:
        json.dump({
            "name": "vuln-test",
            "version": "1.0.0",
            "dependencies": {
                "express": "4.10.0", 
                "lodash": "4.17.10"
            }
        }, f)
        
    print(f"\n[+] Created test Node.js repository at {test_dir}")
    print("[+] Running 'npm install --package-lock-only' to generate lockfile...")
    proc = await asyncio.create_subprocess_shell("npm install --package-lock-only", cwd=test_dir, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    await proc.communicate()
    
    print("[+] Running Vulnerability Service for Node.js...")
    profile = await vulnerability_service._execute_scanner(test_dir, "Node.js")
    
    print("\n--- RESULTS ---")
    print(f"Total Vulnerabilities: {profile.get('total_vulnerabilities')}")
    print(f"Severity Breakdown: Critical={profile.get('critical')} High={profile.get('high')} Medium={profile.get('medium')} Low={profile.get('low')}")
    print(f"Security Score: {profile.get('security_score')}/100")
    print(f"Tools Used: {', '.join(profile.get('tools_used', []))}")
    print("\nTop 3 Vulnerabilities:")
    for v in profile.get('vulnerabilities', [])[:3]:
        print(f" - [{v['severity'].upper()}] {v['package']} ({v['cve']}): {v['description']} | Fix: {v['fix_version']}")
        
    print("\nRecommendations:")
    for r in profile.get('recommendations', []):
        print(f" - {r}")
        
    # Clean up
    import shutil
    shutil.rmtree(test_dir, ignore_errors=True)
    print("\n[+] Benchmark Complete.")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
