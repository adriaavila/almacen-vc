---
name: cicd-setup
description: Set up CI/CD pipelines, automated testing, and deployment. Use when user asks about CI/CD, testing, deployment, GitHub Actions, or pre-commit hooks. Invoke with /cicd-setup or ask naturally.
---

# CI/CD Setup for Vibe Coders

You help set up professional CI/CD through interactive conversation. Analyze the codebase, ask questions, then generate ALL configuration files dynamically based on the user's answers.

## Invocation

This skill can be:
- Explicitly invoked: User types `/cicd-setup`
- Auto-invoked: User asks about CI/CD, testing, deployment, GitHub Actions, pre-commit hooks

## Workflow

### STEP 1: Analyze the Codebase

Run this analysis silently first:
bash
echo "=== Package Files ==="
cat package.json 2>/dev/null | head -40 || true
cat requirements.txt 2>/dev/null | head -30 || true
cat pyproject.toml 2>/dev/null | head -40 || true
cat go.mod 2>/dev/null | head -15 || true
cat Cargo.toml 2>/dev/null | head -20 || true
cat Gemfile 2>/dev/null | head -20 || true

echo "=== Source Files ==="
find . -type f \( -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.go" -o -name "*.rs" -o -name "*.rb" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/venv/*" 2>/dev/null | head -30

echo "=== Existing Config ==="
ls -la .github/workflows/ 2>/dev/null || echo "No workflows"
cat .pre-commit-config.yaml 2>/dev/null | head -20 || echo "No pre-commit"

echo "=== Tests ==="
find . -type f \( -name "test_*" -o -name "*_test.*" -o -name "*.test.*" -o -name "*.spec.*" \) -not -path "*/node_modules/*" 2>/dev/null | wc -l

echo "=== Database ==="
grep -r "DATABASE_URL\|postgres\|mysql\|mongo\|prisma\|sqlalchemy" --include="*.py" --include="*.js" --include="*.ts" --include="*.env*" . 2>/dev/null | head -5


Then summarize:
"I've analyzed your project:
- **Stack:** [language] with [framework]
- **Database:** [detected or none]
- **Existing tests:** [count] files
- **CI/CD:** [exists or not configured]

Let me ask 5 quick questions to set up the right automation."

### STEP 2: Ask Questions (One at a Time)

Ask each question, wait for the answer, store it, then ask the next.

**Q1:** "What stage is your project at?
1. Side project/MVP
2. Real product with users
3. Scaling up (high traffic)
(Reply 1, 2, or 3)"

**Q2:** "Where are you hosting?
1. Haven't decided (I'll recommend)
2. PaaS (Vercel/Railway/Render/Netlify/Fly.io)
3. VPS (DigitalOcean/Hetzner/Linode)
4. Cloud (AWS/GCP/Azure)
5. Other (describe)
(Reply with number or describe)"

**Q3:** "How thorough should testing be?
1. Essential only (critical paths, fast)
2. Balanced (good coverage, reasonable speed)
3. Comprehensive (high coverage, thorough)
(Reply 1, 2, or 3)"

**Q4:** "How should deployments work?
1. Simple (push to main = deploy)
2. Standard (dev branch → dev, main → prod)
3. Controlled (require approval for prod)
(Reply 1, 2, or 3)"

**Q5:** "Deployment notifications?
1. None
2. Slack
3. Discord
4. Other
(Reply with number)"

### STEP 3: Generate Configuration

After collecting ALL answers, generate files dynamically based on:
- The detected stack (language, framework, database)
- The user's specific answers to each question

**You MUST generate these files (content varies based on answers):**

1. **`.pre-commit-config.yaml`** — Generate with:
   - Linting for detected language (ruff for Python, eslint for JS/TS, golangci-lint for Go)
   - Formatting for detected language
   - detect-secrets hook
   - Quick tests on commit (if testing level >= 2)

2. **`.github/workflows/test.yml`** — Generate with:
   - Jobs appropriate for detected language
   - Service containers if database detected (postgres/redis)
   - Coverage thresholds based on testing level (1=60%, 2=75%, 3=85%)
   - Matrix testing if comprehensive level selected

3. **Deployment workflow(s)** — Generate based on hosting answer:
   - PaaS: Note that most auto-deploy, add webhook notification if requested
   - VPS: Generate deploy-prod.yml with SSH deployment + deploy.sh script
   - Cloud: Generate container-based workflow for the specific platform
   - If deployment flow is "Standard" (2): Also generate deploy-dev.yml
   - If deployment flow is "Controlled" (3): Add environment protection rules

4. **`.env.example`** — Generate with all required variables for the detected stack

5. **`SECRETS.md`** — Generate documentation of all GitHub Secrets needed, with instructions for each

6. **Test structure** (if no tests exist AND testing level >= 2):
   - Create `tests/` directory structure appropriate for language
   - Create sample test file for a detected service/model

### STEP 4: Provide Next Steps

After generating all files, provide specific commands:

"✅ Setup complete! Next steps:

1. **Install pre-commit:**
bash
pip install pre-commit && pre-commit install && pre-commit install --hook-type pre-push


2. **Add GitHub Secrets** at `https://github.com/USERNAME/REPO/settings/secrets/actions`:
[List each secret from SECRETS.md with how to get it]

3. **Verify locally:**
bash
pre-commit run --all-files


4. **Commit and push:**
bash
git add . && git commit -m 'Add CI/CD configuration' && git push


5. Check the **Actions tab** in GitHub to see your pipeline run."

## Critical Rules

### Credentials
- ALWAYS use `${{ secrets.NAME }}` for: database URLs, API keys, SSH keys, webhooks
- Test fixture passwords like `"testpassword123"` are OK in test code (add comment: `# Test fixture data`)
- NEVER hardcode real credentials

### Dynamic Generation
- DO NOT use static templates—generate content based on actual detected stack + user answers
- If Python detected: use pytest, ruff, black
- If JS/TS detected: use vitest or jest, eslint, prettier
- If Go detected: use go test, golangci-lint
- If database detected: add service containers to test workflow
- Adapt everything to the specific project

### File Generation
- Generate COMPLETE files, not snippets
- Include comments explaining non-obvious parts
- Use current best practices for each tool