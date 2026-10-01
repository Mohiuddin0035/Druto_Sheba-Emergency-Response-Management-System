# Execution & Tool Usage Constraints

1. TARGETED EDITS ONLY:
   - Do NOT scan, read, or list entire project directories unless explicitly instructed.
   - Restrict file inspection and search queries strictly to the file(s) mentioned in the user prompt.
   - Do NOT perform speculative exploration across unrelated folders or dependencies.

2. SURGICAL MODIFICATIONS:
   - For large files (>500 lines), locate only the relevant function, class, or block. Use slice parameters (`StartLine`, `EndLine`) when reading files.
   - Make targeted replacements or minimal diffs using `replace_file_content` or `multi_replace_file_content`. Do NOT read or re-write the entire file if only a small segment needs changes.
   - Never write a file from scratch if you are only modifying a few lines.

3. PREVENT RECURSIVE RE-INDEXING & ENDLESS LOOPS:
   - After applying an edit, do not initiate automated full-repository re-indexing, broad lint loops, or deep dependency scans.
   - Confirm changes using isolated syntax checks or targeted line reads only.
   - If an issue seems repetitive or loops, STOP and ask the user for clarification rather than blindly retrying the same scan.

4. DIRECT EXECUTION & EFFICIENCY:
   - Avoid infinite deliberation or repetitive sub-agent task creation.
   - State the target location, apply the fix, and stop immediately.
   - Do NOT over-verify. Once you apply an edit, unless you suspect a syntactic breakage, just assume it's applied and finish your turn.

5. TOOL PRIORITIZATION:
   - ALWAYS use specific tools over generic ones. Use `grep_search` instead of scanning files manually line-by-line to find keywords.
   - If you need to view a file, use `view_file`. Do not run shell commands like `cat`, `head`, or `tail` unless absolutely required.
