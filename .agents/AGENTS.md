# Customization Rules for Billcraft-invoice-manager

## Automatic Skill Selection

Whenever the user mentions **"Use skills when necessary"** (or similar phrasing) in a prompt, the agent MUST perform the following steps:
1. **Analyze Project & Context**: Scan the project structure, language, framework (e.g., Next.js, React, Tailwind CSS, TypeScript), and dependencies to identify the domain of the task.
2. **Identify Relevant Skills**: Evaluate the available global skills (from `/Users/shockagg/.gemini/config/skills` and `/Users/shockagg/.agents/skills`) against the current task.
3. **Execute/View Skill Instructions**: Unconditionally read and follow the instructions in the `SKILL.md` file of any matched skill (e.g., `modern-web-guidance`, `react-patterns`, `tailwind-patterns`, `chrome-devtools`, `systematic-debugging`) before proposing or writing code.
4. **Report Used Skills**: In the final response, explicitly list all skills that were referenced, used, or evaluated during the task execution, including links to their files or folder paths.
