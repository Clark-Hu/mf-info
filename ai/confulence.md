可以，这个思路**可行**，而且在企业内部已有 Confluence 的情况下，通常比自己从零做一套权限、用户、审计、发布流程更现实。

你的新架构可以调整成：

```text
                ┌─────────────────────┐
                │      VS Code         │
                │      Copilot         │
                │ 分析/总结/生成草稿   │
                └──────────┬──────────┘
                           │
                           │ 本地轻量客户端 / MCP / CLI
                           ▼
┌──────────────────────────────────────────┐
│         Local Lightweight Agent           │
│  格式化、脱敏、分类、推送、搜索 Confluence │
└──────────┬───────────────────────────────┘
           │
           │ Confluence REST API + Token
           ▼
┌──────────────────────────────────────────┐
│              Confluence                  │
│ 权限 / 页面 / 空间 / 标签 / 历史版本 / 搜索 │
└──────────────────────────────────────────┘
```

一句话：

> **让 Confluence 做企业知识库主存储、权限控制、版本历史和团队协作；本地轻量客户端负责把 Copilot 的输出规范化、脱敏、分类，然后推送到指定空间或页面。**

这是一个很好的落地方案。

---

## 1. 这个方案的职责划分

| 模块 | 职责 |
|---|---|
| **Confluence** | 知识库主存储、权限、空间、页面层级、标签、历史版本、搜索、审计 |
| **Copilot** | 从日志/经验/对话中整理内容，生成结构化 KB 草稿 |
| **本地轻量客户端** | 校验格式、脱敏、分类、调用 Confluence API 创建/更新页面 |
| **MCP Server** | 可选，用于让 Copilot 搜索/读取 Confluence 或提交草稿 |
| **团队成员** | 审核、修订、发布、归档 |

---

## 2. 你说的“借助它的权限”是对的

如果公司 Confluence 已经接入了：

```text
- SSO
- LDAP / AD
- 用户组
- 空间权限
- 页面权限
- 编辑权限
- 审计日志
```

那就不建议你重复造轮子。

你可以直接把权限设计交给 Confluence：

```text
谁能看哪个 Space
谁能编辑哪个页面
谁能审核发布
谁能管理模板
谁能删除页面
```

你的客户端只需要做到：

```text
- 使用用户自己的 token 或公司授权 token
- 尊重 Confluence 的 API 权限返回
- 不绕过 Confluence 权限
- 不在本地额外扩大权限
```

---

## 3. 但要注意 Token 模式

这里有两种模式。

---

### 3.1 每个用户使用自己的 Personal Access Token

这是更推荐的方式。

```text
User Copilot
   ↓
Local Agent 使用用户自己的 Confluence Token
   ↓
Confluence 按该用户权限创建/编辑页面
```

优点：

```text
- 权限天然正确
- 审计日志能看到真实用户
- 不容易越权
- 离职/权限变更后自动受控
```

缺点：

```text
- 每个用户要配置 token
- token 管理稍微麻烦
```

适合：

```text
- 多人维护知识库
- 对审计要求较高
- 希望知道是谁创建/修改了页面
```

---

### 3.2 使用一个共享 Service Account Token

```text
所有客户端都用同一个 confluence-kb-bot token
```

优点：

```text
- 部署简单
- 用户不用配置个人 token
- 权限集中管理
```

缺点：

```text
- 审计里可能都显示为同一个 bot
- 容易权限过大
- token 泄露影响大
- 难以区分谁提交了什么
```

如果用这种方式，建议至少在页面 metadata 中写入：

```yaml
submitted_by: user_id
submitted_from: hostname
created_via: copilot-agent
```

并且让 bot 只拥有指定 Space 的有限权限。

---

## 4. 推荐做法

我建议：

```text
默认使用个人 Token
可选支持 Service Account
```

比如：

```text
CONFLUENCE_BASE_URL=https://confluence.company.com
CONFLUENCE_SPACE_KEY=MFOPS
CONFLUENCE_PARENT_PAGE_ID=123456789
CONFLUENCE_AUTH_MODE=personal_token
```

每个用户本地保存自己的 token。

不要把 token 放在项目代码里。

---

## 5. 本地轻量客户端需要做什么

你可以把它设计成一个小工具：

```text
kb-agent
```

它负责：

```text
1. 接收 Copilot 生成的结构化 KB 草稿
2. 校验字段是否完整
3. 检查敏感信息
4. 分类到正确 Space/Page
5. 转换成 Confluence 页面格式
6. 调用 Confluence REST API 创建页面
7. 添加标签
8. 返回页面链接
```

最小功能：

```text
kb-agent submit incident.md
kb-agent submit runbook.md
kb-agent search "S0C7 ABC123"
kb-agent get PAGE_ID
```

如果结合 MCP：

```text
Copilot → MCP tool → kb-agent / Confluence API
```

---

## 6. 是否还需要 MCP？

看你的目标。

### 如果只是“推送 KB 到 Confluence”

不一定需要 MCP。

可以这样：

```text
Copilot 生成 Markdown
用户保存成文件
运行 kb-agent submit xxx.md
推送到 Confluence
```

这已经能落地。

---

### 如果希望 Copilot 自动调用工具

那就需要 MCP。

例如：

```text
create_confluence_kb_draft
search_confluence_kb
get_confluence_page
update_confluence_kb_page
```

这样 Copilot 可以直接：

```text
- 搜索已有团队知识
- 判断是否重复
- 创建草稿页
- 把页面链接返回给用户
```

更理想的结构是：

```text
Copilot
   ↓ MCP
Local MCP Server
   ↓
Confluence REST API
```

而不是让 Copilot 直接操作 Confluence。

---

## 7. 推荐的整体架构

```text
┌──────────────────────────────────────┐
│              VS Code                 │
│                                      │
│  ┌──────────────┐   ┌─────────────┐  │
│  │   Copilot    │──▶│  MCP Server │  │
│  └──────────────┘   └──────┬──────┘  │
│                            │         │
│                            ▼         │
│                    ┌──────────────┐  │
│                    │  KB Agent     │  │
│                    │ 校验/脱敏/分类 │  │
│                    └──────┬───────┘  │
└───────────────────────────┼──────────┘
                            │
                            │ REST API + Token
                            ▼
┌──────────────────────────────────────┐
│             Confluence               │
│                                      │
│  Space: MFOPS                        │
│   ├── Incidents                      │
│   ├── Runbooks                       │
│   ├── Error Codes                    │
│   ├── JCL Examples                   │
│   ├── Commands                       │
│   └── Drafts                         │
│                                      │
│  权限 / 审计 / 版本 / 搜索 / 标签     │
└──────────────────────────────────────┘
```

---

## 8. Confluence 页面结构建议

建议为大型机团队建一个 Space，例如：

```text
MFOPS - Mainframe Operations Knowledge Base
```

下面分父页面：

```text
MFOPS
├── 00 - Intake Drafts
├── 01 - Incidents
├── 02 - Runbooks
├── 03 - Error Codes
├── 04 - Messages
├── 05 - JCL Examples
├── 06 - Commands
├── 07 - Checklists
├── 08 - Applications
└── 99 - Deprecated
```

Copilot/agent 默认先推送到：

```text
00 - Intake Drafts
```

审核后人工移动到正式分类，或者 agent 根据字段直接创建到指定分类下，但状态标记为 Draft。

---

## 9. 页面标题命名规范

很重要。

否则 Confluence 很快变乱。

推荐标题格式：

### Incident

```text
[INC][2026-09-18][PROD][ABC123][S0C7] JOB ABC123 failed in STEP010
```

### Runbook

```text
[RUNBOOK][DB2][PROD] Restart DB2 batch interface job
```

### Error Code

```text
[ERROR][zOS][S0C7] Data exception troubleshooting guide
```

### Command

```text
[COMMAND][JES2] Display job output with SDSF
```

### JCL

```text
[JCL][SORT] Basic ICETOOL duplicate record check
```

---

## 10. 标签规范

Confluence 标签非常适合做分类检索。

建议统一小写、短横线：

```text
mainframe
zos
jes2
jcl
db2
cics
ims
mq
batch
incident
runbook
error-code
s0c7
sqlcode-805
prod
billing
abc123
```

不要随意大小写混用：

```text
S0C7
s0c7
S0c7
```

建议统一：

```text
s0c7
sqlcode-805
abend-s0c7
```

---

## 11. KB 草稿格式建议

让 Copilot 输出 Markdown，但 front matter 用来给 agent 解析。

```markdown
---
type: incident
status: draft
title: JOB ABC123 failed with S0C7 in STEP010
date: 2026-09-18
environment: PROD
application: Billing
job: ABC123
step: STEP010
program: BILLPGM1
abend: S0C7
sqlcode:
messages:
  - IEF450I
  - CEE3207S
severity: high
tags:
  - mainframe
  - batch
  - s0c7
  - billing
target_space: MFOPS
target_parent: 00 - Intake Drafts
submitted_by: auto
---

# Summary

...

# Symptom

...

# Evidence

```text
...
```

# Analysis

## Confirmed Facts

...

## Assumptions

...

# Root Cause

Pending confirmation.

# Resolution

...

# Verification

...

# Prevention

...

# Related Search Keywords

...
```

agent 做这些事情：

```text
- 读取 YAML front matter
- 校验 type/status/title/tags
- 转成 Confluence storage format 或 Atlassian Document Format
- 创建页面
- 添加 labels
- 返回 URL
```

---

## 12. 不建议让 Copilot 直接推正式页面

更安全的流程：

```text
Copilot 整理
   ↓
kb-agent 校验
   ↓
Confluence Draft/Intake 页面
   ↓
人工 review
   ↓
正式发布/移动页面
```

原因：

```text
- Copilot 可能把推测写成事实
- 日志可能包含敏感信息
- 运维步骤可能有风险
- root cause 可能尚未确认
```

所以建议状态分层：

```text
draft
review-needed
approved
published
deprecated
```

在页面顶部加状态块：

```text
Status: Draft
Reviewer: TBD
Last verified: 2026-09-18
Risk level: Medium
```

---

## 13. 本地客户端可以做的校验

提交前检查：

```text
必填字段：
- type
- title
- status
- summary
- tags

incident 必填：
- date
- environment
- application
- symptom
- evidence
- root_cause_status

runbook 必填：
- purpose
- preconditions
- procedure
- validation
- rollback
- risk_level
```

敏感信息扫描：

```text
password=
pwd=
token=
secret=
apikey
private key
ssh-rsa
racf
bearer
authorization:
```

如果发现敏感内容：

```text
- 阻止提交
- 或标记为 needs-redaction
- 或要求人工确认
```

---

## 14. Confluence API 的映射

你的客户端大概需要调用这些能力：

```text
- 根据 space key 找空间
- 根据父页面标题找 parent page id
- 创建页面
- 更新页面
- 添加 label
- 查询页面
- 搜索页面
```

逻辑大概是：

```text
1. 读取 markdown
2. 解析 YAML
3. 判断 target_space
4. 找到 parent page id
5. 把 markdown 转成 Confluence 支持格式
6. 创建页面
7. 添加 labels
8. 输出链接
```

---

## 15. 简化版命令设计

```bash
kb-agent submit incident.md
```

输出：

```text
Validated: OK
Redaction scan: OK
Target: MFOPS / 00 - Intake Drafts
Created page:
https://confluence.company.com/pages/viewpage.action?pageId=123456789
```

搜索：

```bash
kb-agent search "S0C7 ABC123 STEP010"
```

输出：

```text
1. [INC][2026-09-18][PROD][ABC123][S0C7] JOB ABC123 failed in STEP010
   https://...
   labels: incident, batch, s0c7, billing
```

---

## 16. 如果做成 MCP tools

可以提供这些工具：

```text
search_confluence_kb
get_confluence_page
create_confluence_kb_draft
update_confluence_kb_draft
list_kb_categories
```

### create_confluence_kb_draft

输入：

```json
{
  "type": "incident",
  "title": "JOB ABC123 failed with S0C7 in STEP010",
  "metadata": {
    "environment": "PROD",
    "application": "Billing",
    "job": "ABC123",
    "abend": "S0C7"
  },
  "body_markdown": "...",
  "labels": ["mainframe", "incident", "s0c7", "billing"]
}
```

输出：

```json
{
  "status": "created",
  "page_id": "123456789",
  "url": "https://confluence.company.com/..."
}
```

---

## 17. 这个方案的优点

```text
- 不需要自建复杂知识库系统
- 权限复用 Confluence
- 审计、版本历史天然具备
- 团队成员已经熟悉
- 页面可搜索、可评论、可协作
- 很适合运维知识沉淀
- 后续可以再加 MCP 检索
```

---

## 18. 风险点

需要重点注意这几个：

### 18.1 Token 泄露

本地客户端不要明文保存 token。

建议：

```text
- Windows Credential Manager
- macOS Keychain
- Linux Secret Service
- 企业密钥管理方案
```

至少不要放在：

```text
.env
git repo
配置文件明文
日志
```

---

### 18.2 权限过大

不要给 token 全站权限。

只给：

```text
指定 Confluence Space
指定父页面
创建/编辑页面权限
添加 label 权限
读取搜索权限
```

---

### 18.3 Copilot 幻觉写入 KB

必须有：

```text
- draft 状态
- 人工审核
- root cause status
- confirmed facts / assumptions 分离
```

---

### 18.4 重复页面

提交前应先搜索：

```text
same job + same abend
same title
same error code
same application
similar summary
```

如果疑似重复，客户端提示：

```text
Found possible existing pages:
1. ...
2. ...
Continue creating new page? 
```

---

### 18.5 Confluence 格式转换

Markdown 到 Confluence 不一定完美，尤其是：

```text
- 表格
- 代码块
- 折叠块
- panel
- macro
```

第一版可以先使用简单 Markdown 渲染或 Confluence storage format 的基本元素。

---

## 19. 我建议你的落地顺序

### 第一步：不做 MCP，只做 CLI

先做：

```text
kb-agent submit xxx.md
```

功能：

```text
- 解析 YAML
- 校验字段
- 添加标签
- 创建 Confluence 页面
```

这一步最快能出效果。

---

### 第二步：加入模板

```text
templates/
├── incident.md
├── runbook.md
├── error-code.md
├── command.md
└── jcl-example.md
```

命令：

```bash
kb-agent new incident
kb-agent new runbook
```

---

### 第三步：加入搜索

```bash
kb-agent search "S0C7 DB2 SQLCODE -805"
```

---

### 第四步：做 MCP

让 Copilot 可以调用：

```text
search_confluence_kb
create_confluence_kb_draft
```

---

### 第五步：做 Web UI 或不用做

如果 Confluence 已经足够好，可能连自定义 Web UI 都不需要了。

Confluence 本身就是 Web UI。

你只需要：

```text
Copilot + kb-agent + MCP + Confluence
```

---

## 20. 最推荐的最终方案

我会建议你这样定型：

```text
Confluence = 正式团队知识库
Copilot = 生成和规范化内容
本地 kb-agent = 安全提交器、格式校验器、脱敏器、分类器
MCP = Copilot 访问 Confluence KB 的工具层
```

架构：

```text
┌─────────────────────────────┐
│           Copilot            │
│  总结日志 / 生成 KB 草稿     │
└──────────────┬──────────────┘
               │ MCP tool call
               ▼
┌─────────────────────────────┐
│      Local MCP Server        │
│  search / create draft / get │
└──────────────┬──────────────┘
               │ 调用本地 agent
               ▼
┌─────────────────────────────┐
│        kb-agent              │
│  校验 / 脱敏 / 分类 / 转换   │
└──────────────┬──────────────┘
               │ Confluence API + Token
               ▼
┌─────────────────────────────┐
│        Confluence            │
│ 权限 / 页面 / 标签 / 版本    │
└─────────────────────────────┘
```

---

## 21. 对你原话的修正

你说：

> 只需要在每个客户端启动一个轻量的将 copilot 回答，整理成结构化格式推送到 confluence 指定页面，分类。

可以，但我建议改成：

> **每个客户端运行一个轻量 agent/MCP server，负责接收 Copilot 生成的 KB 草稿，进行字段校验、脱敏检查、分类映射和重复检测，然后使用当前用户的 Confluence token 创建到指定 Space 的 Draft/Intake 页面，并添加统一 labels。正式发布仍由团队在 Confluence 中审核完成。**

这个更安全，也更适合企业环境。

---

## 22. 结论

是的，**如果公司内部已经有 Confluence，并且能提供 API token，那么完全可以借助 Confluence 的权限和协作能力来建设实战团队知识库**。

你不一定需要自建网页知识库。

更优雅的落地方式是：

```text
Confluence 负责知识库本体和权限
Copilot 负责整理和标准化内容
本地轻量 agent/MCP 负责安全提交、分类、检索和格式转换
```

这样你可以最快获得一个可用的团队 KB 系统，同时避免重复建设权限、审计、版本和协作功能。


可以，而且这是更推荐的工程化方案：

> **Confluence 作为权威源（source of truth），本地保留一份只读/半只读 Markdown 缓存，用于快速检索和离线查阅；新增或修改内容仍通过 Confluence API 提交。**

也就是：

```text
写入路径：Copilot / Agent → Confluence API
读取路径：优先本地 Markdown / 索引 → 必要时回退 Confluence API
同步路径：Confluence → 本地 Markdown cache
```

这样可以明显改善体验，尤其是团队 KB 内容变多后，频繁调 Confluence API 搜索会遇到：

```text
- 网络延迟
- API 限流
- Confluence 搜索响应慢
- VPN/内网抖动
- Copilot 等待上下文时间过长
```

---

# 1. 推荐架构

可以设计成下面这样：

```text
┌────────────────────────────┐
│          Confluence         │
│  权威知识库 / 权限 / 审计    │
└──────────────┬─────────────┘
               │
               │ sync pull
               ▼
┌────────────────────────────┐
│      Local KB Cache         │
│  Markdown 文件 + metadata   │
│  SQLite / FTS / 向量索引     │
└──────────────┬─────────────┘
               │
               │ fast local search
               ▼
┌────────────────────────────┐
│   Local Agent / MCP Server  │
│  search / get / submit      │
└──────────────┬─────────────┘
               │
               │ context
               ▼
┌────────────────────────────┐
│      VS Code Copilot        │
└────────────────────────────┘
```

写入时：

```text
Copilot 生成草稿
   ↓
kb-agent 校验/脱敏/分类
   ↓
Confluence API 创建/更新页面
   ↓
同步到本地缓存
```

读取时：

```text
用户问问题
   ↓
Copilot 调 MCP search_kb
   ↓
Local Agent 查本地索引
   ↓
毫秒级返回相关 KB
```

---

# 2. 核心原则：Confluence 是主，本地是缓存

不要让本地 Markdown 变成另一个“事实源”，否则会出现冲突。

推荐原则：

```text
Confluence = authoritative source
Local Markdown = cache / mirror / search index
New content = submit to Confluence first
Local cache = sync from Confluence or after successful submit update
```

也就是说：

```text
本地可以查
本地可以暂存草稿
本地不要直接覆盖正式知识库
```

除非你后续做完整的冲突解决机制。

---

# 3. 本地缓存目录设计

例如每个用户机器上：

```text
~/.kb-agent/
├── config.yaml
├── cache/
│   └── MFOPS/
│       ├── pages/
│       │   ├── 123456789.md
│       │   ├── 123456790.md
│       │   └── 123456791.md
│       ├── attachments/
│       ├── index.sqlite
│       ├── vector.index
│       └── sync-state.json
├── drafts/
│   └── 2026-09-18-abc123-s0c7.md
└── logs/
```

每个页面用 Confluence page id 命名：

```text
123456789.md
```

而不是用标题命名。

原因：

```text
- 标题可能改
- 页面可能移动
- page id 稳定
- 避免文件名非法字符问题
```

---

# 4. Markdown 文件格式

每个本地 Markdown 文件建议有 front matter：

```markdown
---
page_id: "123456789"
space: "MFOPS"
title: "[INC][2026-09-18][PROD][ABC123][S0C7] JOB ABC123 failed in STEP010"
version: 7
status: published
parent_id: "987654321"
url: "https://confluence.company.com/pages/viewpage.action?pageId=123456789"
labels:
  - incident
  - mainframe
  - batch
  - s0c7
  - billing
updated_at: "2026-09-18T10:30:00Z"
updated_by: "zhangsan"
last_synced_at: "2026-09-18T10:35:00Z"
content_hash: "sha256:..."
---

# Summary

...

# Symptom

...

# Resolution

...
```

这样本地 agent 搜索时可以快速读取：

```text
- page_id
- title
- labels
- type
- application
- abend
- job
- updated_at
```

---

# 5. 本地索引建议

如果只是几百篇 KB：

```text
Markdown 文件 + ripgrep
```

就够了。

如果是几千到几万篇：

```text
SQLite FTS5
```

很合适。

如果要给 Copilot 做语义搜索：

```text
SQLite FTS5 + 向量索引
```

推荐组合：

```text
第一阶段：SQLite FTS5
第二阶段：再加 embeddings / vector index
```

不要一开始就上向量库。

---

## 5.1 SQLite 表设计示例

```sql
CREATE TABLE pages (
  page_id TEXT PRIMARY KEY,
  space TEXT NOT NULL,
  title TEXT NOT NULL,
  parent_id TEXT,
  url TEXT,
  version INTEGER,
  status TEXT,
  updated_at TEXT,
  updated_by TEXT,
  content_hash TEXT,
  local_path TEXT,
  last_synced_at TEXT
);

CREATE TABLE labels (
  page_id TEXT,
  label TEXT,
  PRIMARY KEY (page_id, label)
);

CREATE VIRTUAL TABLE pages_fts USING fts5(
  page_id UNINDEXED,
  title,
  labels,
  content
);
```

查询时：

```sql
SELECT page_id, title, snippet(pages_fts, 3, '<b>', '</b>', '...', 10)
FROM pages_fts
WHERE pages_fts MATCH 'S0C7 ABC123 STEP010'
LIMIT 10;
```

---

# 6. 同步策略

可以支持多种同步模式。

## 6.1 启动时轻量同步

客户端启动时先做：

```text
1. 读取本地 sync-state.json
2. 查询 Confluence 自上次同步以来变更的页面
3. 拉取增量内容
4. 更新本地 Markdown 和索引
```

适合：

```text
- VS Code 启动
- agent 启动
- 每天第一次使用
```

---

## 6.2 定时后台同步

例如：

```text
每 15 分钟同步一次 metadata
每 1 小时同步一次全文
每天凌晨做一次全量校验
```

示例：

```yaml
sync:
  mode: incremental
  metadata_interval_minutes: 15
  content_interval_minutes: 60
  full_verify_interval_hours: 24
```

---

## 6.3 手动同步

命令：

```bash
kb-agent sync
kb-agent sync --space MFOPS
kb-agent sync --full
kb-agent sync --page 123456789
```

---

## 6.4 提交后即时同步

新增页面成功后：

```text
1. 调 Confluence API 创建页面
2. 获取 page_id/version/url
3. 将提交内容保存为本地 Markdown
4. 更新 SQLite index
5. 返回链接
```

这样用户马上能搜到新内容。

---

# 7. 增量同步怎么做

同步状态文件：

```json
{
  "space": "MFOPS",
  "last_sync_time": "2026-09-18T10:35:00Z",
  "last_full_sync_time": "2026-09-18T00:00:00Z",
  "pages": {
    "123456789": {
      "version": 7,
      "content_hash": "sha256:abc..."
    }
  }
}
```

同步逻辑：

```text
1. 查询 Confluence 中 space=MFOPS 且 updated_at > last_sync_time 的页面
2. 对比 page_id/version
3. version 变了才拉全文
4. 转成 Markdown
5. 写入本地文件
6. 更新索引
7. 更新 last_sync_time
```

如果 Confluence API 不方便按精确时间查，也可以按 CQL 查询：

```text
space = MFOPS AND type = page AND lastmodified > "2026-09-18"
```

---

# 8. 删除/归档怎么处理

这是容易忽略的点。

Confluence 上页面被删除或移动后，本地缓存要处理。

建议：

```text
不要立即物理删除本地文件
先标记 deleted 或 archived
```

front matter：

```yaml
status: deleted
deleted_at: "2026-09-18T11:00:00Z"
```

本地查询默认不显示：

```text
status != deleted
```

支持：

```bash
kb-agent search "S0C7" --include-deleted
```

全量校验时发现页面不存在：

```text
- 标记为 deleted
- 从 FTS 索引移除
- 保留文件 30 天
```

---

# 9. 权限问题：本地缓存不能越权

这个设计最大的风险是：

> 用户本地缓存了自己曾经有权访问的页面，但后来权限被撤销，本地仍能看到。

这在企业里要认真处理。

建议策略：

## 9.1 每个用户只同步自己 token 可访问的内容

不要用一个高权限 service account 给所有人下发全量 KB。

否则会绕过 Confluence 权限。

推荐：

```text
每个客户端使用当前用户自己的 token
只同步该用户 API 可读取的页面
```

---

## 9.2 定期权限再验证

同步时重新用当前 token 查询可访问页面。

如果发现不可访问：

```text
- 从索引删除
- 本地文件加密或删除
- 标记 revoked
```

更严格：

```text
直接删除本地文件
```

---

## 9.3 本地缓存加密

如果内容敏感，建议：

```text
- 本地缓存目录加密
- 使用 OS keychain 保存密钥
- 禁止缓存附件或只缓存白名单附件
```

尤其如果 KB 里可能有：

```text
- 生产环境信息
- 应用拓扑
- 运维命令
- 事故复盘
- 客户数据
```

---

# 10. 推荐的读写模型

我建议分成三种本地对象：

```text
remote-cache/
drafts/
outbox/
```

## 10.1 remote-cache

从 Confluence 同步下来的内容。

```text
只读
不要直接编辑
```

如果用户改了本地 cache 文件，下次同步会被覆盖。

---

## 10.2 drafts

用户本地草稿。

```text
可以编辑
可以提交
未提交到 Confluence
```

---

## 10.3 outbox

提交失败时暂存。

```text
待重试
```

例如 VPN 断开时：

```text
kb-agent submit incident.md
```

返回：

```text
Confluence unavailable.
Saved to outbox.
Run `kb-agent push` when network is available.
```

---

# 11. 搜索路径设计

搜索时优先本地：

```text
kb-agent search "S0C7 ABC123"
```

流程：

```text
1. 查 SQLite FTS
2. 如果结果足够，直接返回
3. 如果结果很少，提示是否在线搜索
4. 可选回退 Confluence API
```

返回示例：

```text
Found 5 local results. Cache last synced: 2026-09-18 10:35.

1. [INC][2026-09-18][PROD][ABC123][S0C7] JOB ABC123 failed in STEP010
   page_id: 123456789
   labels: incident, batch, s0c7, billing
   updated: 2026-09-18 10:30
   url: https://...

2. [ERROR][zOS][S0C7] Data exception troubleshooting guide
   page_id: 123456700
   labels: error-code, zos, s0c7
```

如果缓存过旧：

```text
Warning: local cache is 3 days old. Run `kb-agent sync`.
```

---

# 12. MCP tools 设计

如果你接入 Copilot/MCP，可以提供这些工具：

```text
search_local_kb
get_local_kb_page
sync_kb
submit_kb_draft
search_remote_confluence
```

推荐默认：

```text
search_local_kb
```

只有用户明确要求或本地没有结果时才用：

```text
search_remote_confluence
```

例如：

```json
{
  "tool": "search_local_kb",
  "arguments": {
    "query": "S0C7 ABC123 STEP010",
    "limit": 5
  }
}
```

返回给 Copilot 的内容不要太长：

```json
{
  "cache_last_synced_at": "2026-09-18T10:35:00Z",
  "results": [
    {
      "page_id": "123456789",
      "title": "...",
      "summary": "...",
      "labels": ["incident", "s0c7"],
      "url": "...",
      "snippet": "..."
    }
  ]
}
```

---

# 13. 同步冲突怎么处理

因为本地 cache 是只读，所以冲突少很多。

写入流程：

```text
用户编辑 drafts/xxx.md
提交到 Confluence
Confluence 返回 version
本地更新 cache
```

如果是更新已有页面，要带版本号。

提交前检查：

```text
本地知道的 version = 7
远端当前 version = 8
```

说明有人改过：

```text
Reject update
提示用户先拉取最新版本
生成 diff
人工合并
```

不要自动覆盖。

---

# 14. 缓存更新粒度

建议不要每次同步都拉全文。

分两层：

## 14.1 Metadata sync

频率高。

拉取：

```text
page_id
title
version
updated_at
updated_by
labels
parent_id
```

用于判断哪些页面变了。

---

## 14.2 Content sync

频率低或按需。

只有当：

```text
version 变化
本地没有该页面
用户打开该页面
```

才拉全文。

---

# 15. 是否需要 Git？

可以，但不建议一开始用 Git 做主同步机制。

Git 适合：

```text
- 版本追踪
- 审核 diff
- 离线编辑
- 灾备
```

但如果 Confluence 是权威源，Git 可能引入三方同步复杂度。

推荐第一版：

```text
Confluence API + local Markdown + SQLite index
```

后续如果需要，可以增加：

```text
kb-agent export --git
```

例如每天自动导出到内部 Git 仓库做备份和审计。

---

# 16. 客户端同步模式建议

配置示例：

```yaml
confluence:
  base_url: "https://confluence.company.com"
  space: "MFOPS"
  auth_mode: "personal_token"

cache:
  enabled: true
  path: "~/.kb-agent/cache"
  format: "markdown"
  encrypt: true

sync:
  startup: true
  interval_minutes: 30
  full_verify_interval_hours: 24
  content_strategy: "changed_only"
  conflict_policy: "remote_wins_for_cache"

search:
  provider: "sqlite_fts5"
  max_results: 10
  fallback_remote: "ask"
```

---

# 17. 命令设计

```bash
# 初始化
kb-agent init

# 同步当前用户可见内容
kb-agent sync

# 全量校验
kb-agent sync --full

# 搜索本地缓存
kb-agent search "S0C7 ABC123"

# 搜索远端 Confluence
kb-agent search "S0C7 ABC123" --remote

# 查看页面
kb-agent open 123456789

# 创建草稿
kb-agent new incident

# 提交草稿
kb-agent submit drafts/inc-abc123-s0c7.md

# 更新已有页面
kb-agent update 123456789 drafts/fix.md

# 清理无权限/已删除缓存
kb-agent cache prune
```

---

# 18. 本地检索体验

可以做成：

```text
kb-agent search "S0C7"
```

毫秒级返回：

```text
Local KB search
Cache: MFOPS
Last synced: 2026-09-18 10:35
Results: 8

[1] [ERROR][zOS][S0C7] Data exception troubleshooting guide
    labels: zos, abend, s0c7
    updated: 2026-09-16
    page: 123456700

[2] [INC][2026-09-18][PROD][ABC123][S0C7] JOB ABC123 failed in STEP010
    labels: incident, batch, billing
    updated: 2026-09-18
    page: 123456789
```

然后：

```bash
kb-agent show 1
```

或者：

```bash
kb-agent open 123456789 --browser
```

---

# 19. 对 Copilot 很友好的上下文输出

不要把整篇 KB 全塞给 Copilot。

MCP search 返回：

```text
- title
- summary
- relevant snippet
- labels
- confidence
- url
```

用户确认后再调用：

```text
get_local_kb_page
```

获取全文或指定章节。

这样能减少上下文污染。

---

# 20. 推荐的最终读写流程

## 查询流程

```text
用户问：这个 S0C7 怎么处理？
   ↓
Copilot 调用 search_local_kb("S0C7")
   ↓
本地 SQLite FTS 返回 5 条
   ↓
Copilot 总结相关 KB
   ↓
如果本地缓存过旧，提示可执行 sync
```

---

## 新增流程

```text
用户让 Copilot 总结事故
   ↓
Copilot 生成 incident markdown
   ↓
kb-agent validate
   ↓
kb-agent redact-check
   ↓
kb-agent submit
   ↓
Confluence API 创建 draft page
   ↓
本地 cache 立即写入
   ↓
返回 Confluence URL
```

---

## 更新流程

```text
用户发现某 KB 需要修订
   ↓
kb-agent edit 123456789
   ↓
拉取远端最新 version
   ↓
用户/AI 修改草稿
   ↓
提交前检查 version
   ↓
Confluence API update
   ↓
本地 cache 更新
```

---

# 21. 最重要的安全建议

如果你做本地缓存，务必要加这些限制：

```text
1. 每个用户用自己的 token 同步
2. 不用高权限 token 下发全量 KB
3. 本地缓存可配置加密
4. 定期 revalidate 权限
5. 用户离职或权限撤销后清理缓存
6. 不缓存特别敏感页面或附件
7. 本地索引也要保护，因为索引里可能包含敏感文本
```

很多人只加密 Markdown，忘了 SQLite FTS 里也有全文。

所以如果加密，要考虑：

```text
- markdown 文件
- sqlite index
- vector index
- logs
- outbox
```

---

# 22. 建议你采用的方案

可以这样定：

```text
Confluence API：用于写入、审核、权限、版本管理
Local Markdown Cache：用于快速查阅和离线访问
SQLite FTS：用于本地全文搜索
MCP Server：向 Copilot 暴露 search/get/submit 工具
Sync Worker：后台增量同步 Confluence 到本地
```

架构总结：

```text
                 Read Path
Copilot ──MCP──▶ Local KB Search ──▶ Markdown + SQLite FTS
                         │
                         └── optional fallback ──▶ Confluence API


                 Write Path
Copilot ──MCP──▶ kb-agent validate/redact/submit ──▶ Confluence API
                                                        │
                                                        ▼
                                               update local cache
```

---

# 23. 结论

是的，**不要每次都通过 Confluence API 搜索**。

更好的方案是：

```text
本地维护一份按用户权限同步下来的 Markdown KB cache，
配合 SQLite FTS 或向量索引做快速检索；
新增/更新仍通过 Confluence API，
Confluence 始终作为权威源和权限边界。
```

这样可以兼顾：

```text
- 快速查询
- 离线可用
- 权限可控
- 审计完整
- 不重复建设知识库
- Copilot 集成体验好
```

第一版建议就做：

```text
Confluence → Markdown cache
Markdown cache → SQLite FTS
submit/update → Confluence API
```

不要一开始就做太复杂的分布式协同编辑。