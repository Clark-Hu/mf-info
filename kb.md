是的，这个点比 `$copied`、目录命名、metadata 都更重要。

你现在缺的不是“代码仓库”，而是一个**可持续积累的本地问题经验库**，让 Agent 在不能联网、不了解你环境历史的情况下，也能参考你以前遇到过的问题、错误信息、处理过程和结论。

建议单独建一个区域，比如：

```text
knowledge/
  incidents/
  errors/
  notes/
  solutions/
```

或者更简单一点：

```text
kb/
  incidents/
  errors/
  howto/
  decisions/
```

我更推荐简单名字：

```text
kb/
```

意思就是 local knowledge base。

---

## 建议的结构

```text
kb/
  README.md

  errors/
    iefbr14/
    idcams/
    dfsort/
    rexx/
    smf/
    tape/
    catalog/
    racf/
    hsm/
    rmm/
    cadisk/

  howto/
    rexx/
    jcl/
    smf/
    catalog/
    sort/
    hsm/
    rmm/

  incidents/
    2026/
      2026-08-19-smf30-jobname-missing.md

  decisions/
    2026-08-19-use-approved-code-as-style-source.md
```

如果你想低维护，可以再简化成：

```text
kb/
  errors/
  howto/
  incidents/
  decisions/
```

---

# 1. 各目录用途

## `kb/errors/`

放具体错误、报错信息、RC、abend、message id、utility error。

例如：

```text
kb/errors/idcams/IDC3014I-return-code-8.md
kb/errors/dfsort/ICE046A-invalid-field.md
kb/errors/rexx/IRX0040I-invalid-character.md
kb/errors/jcl/IEF642I-excessive-parameter-length.md
```

Agent 看到类似错误时应该优先搜索这里。

---

## `kb/howto/`

放你已经总结过的做法。

例如：

```text
kb/howto/rexx/read-stem-from-execio.md
kb/howto/jcl/pass-symbol-to-proc.md
kb/howto/smf/parse-smf30-cpu-time.md
kb/howto/catalog/listcat-filter-nonvsam.md
```

这类内容不是 incident，而是可复用知识。

---

## `kb/incidents/`

放一次具体问题的完整过程：

- 背景；
- 错误；
- 诊断；
- 尝试过什么；
- 最后怎么解决；
- 后续注意事项。

这最适合记录“当时踩坑”的经验。

---

## `kb/decisions/`

放你定下来的本地规则或技术决策。

例如：

```text
kb/decisions/2026-08-19-agent-output-location.md
kb/decisions/2026-08-19-approved-code-usage.md
kb/decisions/2026-08-19-do-not-treat-copied-as-source.md
```

这类内容可以避免以后 Agent 又反复建议你已经否定过的方案。

---

# 2. 最小模板

重点是**低维护**，否则你不会长期坚持。

建议只用一个模板：

```markdown
# Title

## Symptom

What was observed?

Error messages, RC, abend code, command output, or unexpected behavior.

## Context

Environment, tool, job, utility, dataset type, or related code.

## Cause

Known or suspected cause.

## Fix

What worked.

## Notes

Caveats, related commands, links to local manuals, related files, or follow-up.
```

够用了。

---

# 3. 错误记录模板示例

```markdown
# IDCAMS LISTCAT returns RC=8 when dataset pattern is invalid

## Symptom

IDCAMS LISTCAT ended with RC=8.

Message:

```text
IDC3014I CATALOG ERROR
IDC3009I ** VSAM CATALOG RETURN CODE IS ...
```

## Context

Used in batch JCL to list datasets by HLQ pattern.

## Cause

The dataset mask was not accepted by LISTCAT in this form.

## Fix

Use a valid `ENTRIES(...)` pattern or change to `LEVEL(...)`.

Example:

```jcl
//SYSIN DD *
  LISTCAT LEVEL(HLQ.SUBHLQ)
/*
```

## Notes

Check whether the intended search is exact entry lookup or catalog level scan.
```

这种记录哪怕不完整，也比没有强。

---

# 4. Agent 应该如何使用 KB

在 `AGENTS.md` 里加一段：

```markdown
## Local Knowledge Base

The `kb/` directory contains accumulated local troubleshooting knowledge,
past errors, incidents, how-to notes, and technical decisions.

Before answering questions about errors, abends, return codes, unexpected behavior,
or environment-specific operational procedures, the agent should search `kb/`
for relevant prior notes.

Use priority:

1. `kb/errors/` for known messages, RCs, abends, and utility errors.
2. `kb/incidents/` for similar past cases.
3. `kb/howto/` for reusable procedures.
4. `kb/decisions/` for local conventions and previously made decisions.

The agent should not assume `kb/` is complete or always correct, but it should
prefer local KB notes over generic assumptions when they match the current issue.

If a problem is solved or clarified during the session, the agent should suggest
a short KB entry that the user can save under `kb/`.
```

这是核心。

---

# 5. 技术沉淀要解决两个动作

你真正需要的是两个动作：

## 5.1 问题发生时：Agent 会查历史

你问：

> 这个 IDCAMS RC=8 是什么原因？

Agent 应该先：

```text
查 kb/errors/idcams/
查 kb/incidents/
查 kb/howto/catalog/
```

然后再回答。

---

## 5.2 问题解决后：Agent 会沉淀记录

当一个问题解决后，Agent 应该主动说：

```markdown
建议保存以下 KB 条目：

Path:
`kb/errors/idcams/IDC3014I-listcat-rc8-invalid-mask.md`

Content:
...
```

你只要复制进去即可。

这比要求 Agent 自动维护复杂系统更实际。

---

# 6. 文件命名规则

不用复杂 metadata。  
文件名尽量包含可搜索关键词。

推荐：

```text
<message-id>-<short-cause>.md
<abend-code>-<short-cause>.md
<utility>-rc<code>-<short-cause>.md
<topic>-<short-howto>.md
```

例如：

```text
IEC141I-013-18-dataset-not-found.md
S013-18-lrecl-or-dcb-mismatch.md
IDC3014I-listcat-rc8-catalog-error.md
ICE046A-dfsort-field-out-of-range.md
IRX0040I-rexx-invalid-character.md
IKJ56228I-dataset-not-in-catalog.md
```

这样 Agent 和你自己都容易搜。

---

# 7. 最低成本做法

如果你不想一开始分类太细，直接这样就行：

```text
kb/
  errors.md
  howto.md
  incidents.md
  decisions.md
```

但我不太推荐长期只用大文件，因为后面搜索和编辑会变差。

更折中：

```text
kb/
  errors/
  howto/
  incidents/
  decisions/
```

每个问题一个 markdown 文件。

这是最稳的。

---

# 8. 和 `skills`、`approved` 的区别

需要明确边界：

```text
skills/      = Agent 行为规则、编码规范、注意事项
approved/    = 可模仿的高质量代码样例
kb/errors/   = 过去遇到过的错误和解决方法
kb/howto/    = 可复用操作步骤
kb/incidents/ = 某次具体问题的完整排查记录
kb/decisions/ = 已经做过的本地技术决策
```

这样 Agent 不会混用。

---

# 9. 建议的最终目录补充

结合你已有结构，可以加：

```text
kb/
  README.md
  errors/
    jcl/
    rexx/
    sort/
    idcams/
    smf/
    hsm/
    rmm/
    cadisk/
    catalog/
    racf/
  howto/
    jcl/
    rexx/
    sort/
    smf/
    catalog/
    hsm/
    rmm/
    cadisk/
  incidents/
    2026/
  decisions/
```

如果觉得太多，先这样：

```text
kb/
  README.md
  errors/
  howto/
  incidents/
  decisions/
```

后面自然长出来。

---

# 10. 最关键的一段 AGENTS.md

可以直接加这个：

```markdown
## Technical Knowledge Base

The `kb/` directory is the local technical memory of this workspace.

It contains prior errors, incidents, troubleshooting notes, how-to procedures,
and local technical decisions.

When the user asks about:

- error messages
- abends
- return codes
- failed jobs
- unexpected utility behavior
- environment-specific procedures
- something that may have happened before

the agent should search `kb/` before giving a final answer.

Recommended lookup order:

1. `kb/errors/`
2. `kb/incidents/`
3. `kb/howto/`
4. `kb/decisions/`

If relevant KB notes are found, cite or mention the local file path used.

If no relevant KB note is found, say so briefly and proceed using manuals,
skills, approved code, and general reasoning.

After solving a non-trivial issue, the agent should offer a concise KB entry
with a suggested path and Markdown content, so the user can save it for future use.
```

---

# 11. 我的建议总结

你现在应该新增：

```text
kb/
```

它是技术沉淀的核心。

并在 `AGENTS.md` 里明确：

```text
遇到问题先查 kb
写代码先查 skills
找风格先查 approved
查权威事实看 Manual/bookshelf
输出结果放 work
```

一句话：

> **`kb/` 解决“我以前遇到过但忘了”的问题；`skills/` 解决“Agent 应该怎么做”；`approved/` 解决“代码应该长什么样”。**
