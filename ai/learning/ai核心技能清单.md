# ai核心技能清单

下面是一份**面向 2026 最新趋势的「全栈 AI Agent 开发工程师」核心技能清单**。这里的“全栈”不只是前后端，而是覆盖：**模型调用、Agent 编排、工具集成、RAG、后端服务、前端交互、部署、评测、观测、安全与业务落地**。

---

## 一、最核心技能总览

---

# LLM API 与 Agent SDK 开发

你需要熟练掌握主流大模型 API 的调用方式，包括：

- OpenAI / Anthropic / Google / DeepSeek / Qwen / Llama 等模型接口

- Chat Completions / Responses API / Agents SDK

- Streaming 输出

- Structured Outputs

- JSON Schema

- 多模态输入输出

- 上下文窗口管理

- 模型路由与 fallback

- Token 计费与延迟控制

现在 Agent 开发已经不只是“写 prompt”，而是要会使用 SDK 提供的工具调用、结构化输出、追踪、会话状态、并发控制等能力。OpenAI Agents SDK 已经提供了 Agent、tool、结构化输出、Tracing 等基础设施；OpenAI 也在推进 MCP、skills、沙箱执行、文件编辑、shell tool 等更偏生产级的 Agent 能力。\(openai\.github\.io\)

**建议掌握：**

```Plain Text
OpenAI API
Anthropic API
Gemini API
LangChain
LangGraph
OpenAI Agents SDK
Vercel AI SDK
LlamaIndex
```

---

# Prompt Engineering 已升级为 Context Engineering

传统 Prompt Engineering 仍然重要，但趋势已经转向 **Context Engineering**，也就是如何给 Agent 提供正确、最少、可控、可验证的上下文。

你需要掌握：

- System Prompt 设计

- Role / Instruction / Constraint 分层

- Few\-shot 示例设计

- 长上下文裁剪

- Memory 设计

- Context Compression

- Tool Description 设计

- Agent Persona 与行为边界

- 可版本化 prompt 管理

- Prompt A/B Test

对于 Agent 来说，prompt 不只是“写得好”，而是要具备：

```Plain Text
可测试
可回滚
可观测
可复用
可权限控制
```

尤其在企业场景中，prompt、tool schema、knowledge base、policy 都应该像代码一样进行版本管理。

---

# Tool Calling / Function Calling / MCP

这是 AI Agent 工程师最关键的技能之一。

Agent 与普通 Chatbot 最大区别在于：**Agent 能调用工具、访问系统、执行动作**。

你需要掌握：

- Function Calling

- Tool Calling

- JSON Schema 参数定义

- Tool 参数校验

- Tool 输出格式化

- Tool 执行失败重试

- Tool Timeout

- Tool 权限控制

- Human approval

- Tool sandbox

- 幂等性设计

- 审计日志

- MCP Server 开发

OpenAI 文档强调 Function Calling 应配合 Structured Outputs 或校验与重试机制，以确保工具参数符合预期 schema。\(help\.openai\.com\)

MCP，即 Model Context Protocol，已经成为 Agent 连接外部工具和数据源的重要标准。2026 年的 Agent 趋势中，MCP、skills、tool layer 的重要性持续上升。有研究显示，AI Agent 的工具生态增长迅速，尤其软件开发相关工具在 MCP 工具中占比很高。\(arxiv\.org\)

**你应该能独立开发这些工具：**

```Plain Text
数据库查询工具
CRM 查询工具
GitHub 工具
Slack / 飞书 / 企业微信工具
浏览器自动化工具
文件读写工具
代码执行工具
搜索工具
邮件发送工具
支付 / 订单 / 工单工具
内部系统 API 工具
```

---

# RAG 与企业知识库工程

RAG 仍然是企业 AI Agent 最主流的落地场景之一。

你需要掌握：

- 文档解析

- PDF / Word / Excel / HTML / Markdown 处理

- Chunking 策略

- Embedding 模型选择

- 向量数据库

- Hybrid Search

- BM25

- Reranking

- Metadata Filter

- Query Rewrite

- Multi\-query Retrieval

- Contextual Retrieval

- Graph RAG

- Agentic RAG

- 权限感知检索

- 引用溯源

- 知识更新管道

常见技术栈：

```Plain Text
pgvector
Pinecone
Weaviate
Milvus
Qdrant
Elasticsearch
OpenSearch
LlamaIndex
LangChain
Unstructured
Marker
Docling
```

对于求职来说，普通 RAG 已经不够，你最好掌握：

```Plain Text
Naive RAG
Advanced RAG
Agentic RAG
Graph RAG
Hybrid RAG
Multimodal RAG
```

尤其是**权限感知 RAG**非常重要。企业知识库不能让员工通过 Agent 查到自己本来无权访问的内容。

---

# Agent 编排与工作流设计

生产级 Agent 通常不是一个大模型无限循环，而是一个受控工作流。

你需要掌握：

- ReAct Agent

- Plan\-and\-Execute

- Router Agent

- Multi\-Agent Collaboration

- Supervisor Agent

- Reflection Agent

- Evaluator\-Optimizer

- Human\-in\-the\-loop

- State Machine

- DAG Workflow

- Event\-driven Agent

- Long\-running Task

- Agent Memory

- Agent Handoff

- Deterministic \+ Agentic Hybrid Workflow

LangGraph 这类框架的价值在于用图结构管理 Agent 状态、节点、分支、重试和人类审批。LangChain 近期也强调，Agent 评测不能只看最终结果，还要看运行过程、trace、thread、tool choice 和中间步骤。\(langchain\.com\)

**核心思想：**

> 不要把所有事情都交给一个自由发挥的 Agent。
>  能确定的流程用代码，不能确定的部分交给模型。
> 
> 

也就是：

```Plain Text
确定性工作流 + LLM 决策节点 + 工具调用 + 评测 + 观测
```

---

# 后端开发能力

全栈 AI Agent 工程师必须具备扎实后端能力。

你需要掌握：

- Python / TypeScript 至少精通一个

- FastAPI / Flask / Django

- Node\.js / NestJS / Express

- REST API

- GraphQL

- WebSocket

- Server\-Sent Events

- OAuth2 / OIDC

- JWT

- RBAC / ABAC

- 数据库建模

- 异步任务队列

- 缓存

- 文件存储

- 日志系统

- API Gateway

- Webhook

常用技术：

```Plain Text
Python
TypeScript
FastAPI
Next.js
NestJS
PostgreSQL
Redis
MongoDB
Kafka
RabbitMQ
Celery
BullMQ
S3 / MinIO
```

Agent 常常涉及长任务，因此你还要掌握：

```Plain Text
任务状态管理
异步执行
任务取消
任务重试
超时控制
并发限制
队列优先级
断点恢复
```

---

# 前端开发与 AI 交互体验

全栈 Agent 工程师需要能做出可用的 AI 产品界面，而不只是 API。

你需要掌握：

- React / Next\.js

- TypeScript

- Tailwind CSS

- Chat UI

- Streaming UI

- Markdown 渲染

- Code block 渲染

- Tool call 可视化

- Trace timeline

- Human approval UI

- 文件上传

- 多轮对话管理

- Copilot sidebar

- Agent 工作流面板

- 表格 / 图表 / Dashboard

- SSE / WebSocket 实时更新

AI Agent 的前端不只是聊天框。未来趋势是：

```Plain Text
Chat UI
Copilot UI
Workflow UI
Canvas UI
Approval UI
Trace UI
Agent Control Panel
```

特别是当 Agent 可以发邮件、改数据、调接口、下订单时，前端必须提供**确认、审批、撤销、日志、权限提示**。

---

# AI 评测与可观测性

这是 2026 年 AI Agent 工程里最重要的趋势之一。

很多团队已经不再只问：

> 这个 Agent 能不能跑？
> 
> 

而是问：

> 它在生产环境中稳定吗？
>  为什么这次失败？
>  改了 prompt 后有没有退化？
>  工具调用路径是否合理？
>  成本和延迟是否可控？
> 
> 

LangChain 的 Agent Engineering 调研显示，很多组织已经实现了可观测性，但离线评测和在线评测的采用率仍明显较低，这说明 evals 是正在快速补课的关键能力。\(langchain\.com\)

你需要掌握：

- Trace

- Span

- Session

- Run

- Thread

- Token usage

- Latency

- Cost monitoring

- Tool call success rate

- Hallucination detection

- Regression test

- Golden dataset

- LLM\-as\-judge

- Human evaluation

- Online eval

- Offline eval

- A/B test

- Prompt version evaluation

常见工具：

```Plain Text
LangSmith
Langfuse
Braintrust
Weights & Biases Weave
Arize Phoenix
Helicone
OpenTelemetry
Datadog
OpenAI Tracing
```

**关键能力：**

```Plain Text
把一次生产失败 trace 转成回归测试
```

这是高级 Agent 工程师和初级 Agent 工程师的分水岭。

---

# Agent 安全与权限治理

Agent 安全是 2026 非常重要的方向。

因为 Agent 不只是回答问题，它可能会：

```Plain Text
查询数据库
发送邮件
修改 CRM
执行代码
操作浏览器
访问企业文档
调用支付接口
创建工单
提交 Pull Request
```

你需要掌握：

- Prompt Injection 防护

- Tool Injection 防护

- Data Exfiltration 防护

- 权限隔离

- Least Privilege

- Human\-in\-the\-loop 审批

- Secret 管理

- PII 脱敏

- 审计日志

- MCP Server 安全

- 沙箱执行

- 文件访问控制

- Agent 身份认证

- Per\-agent credentials

- Rate limit

- Abuse detection

尤其需要注意：

```Plain Text
模型输出不可信
工具参数不可信
用户上传文档不可信
网页内容不可信
MCP 工具不可信
```

所以你要会设计：

```Plain Text
输入校验
输出校验
工具白名单
权限边界
沙箱
审批流
审计日志
回滚机制
```

---

# 部署、DevOps 与 MLOps / LLMOps

生产级 Agent 需要稳定部署。

你需要掌握：

- Docker

- Kubernetes

- CI/CD

- GitHub Actions

- Terraform

- AWS / GCP / Azure

- Vercel

- Cloudflare

- Serverless

- GPU / CPU 服务部署

- 日志与监控

- 灰度发布

- 回滚

- 配置管理

- Secret 管理

- 多环境部署

- 成本监控

Agent 特有的 LLMOps 能力包括：

```Plain Text
Prompt versioning
Model versioning
Eval pipeline
Dataset management
Trace collection
Cost dashboard
Latency dashboard
Model routing
Cache
Fallback
Rate limit
```

你还需要了解：

```Plain Text
Semantic cache
Embedding cache
LLM response cache
Batch inference
Queue-based execution
Provider fallback
```

---

# 数据工程与数据库能力

AI Agent 经常需要连接企业数据。

你需要掌握：

- SQL

- PostgreSQL

- MySQL

- MongoDB

- Redis

- Elasticsearch / OpenSearch

- 向量数据库

- 数据清洗

- ETL

- 数据权限

- 数据血缘

- CDC

- 数据同步

- 数据质量检测

对于 RAG 系统，你还需要掌握：

```Plain Text
文档入库 pipeline
增量更新
去重
版本管理
索引重建
元数据管理
权限同步
检索日志分析
```

---

# 多模态 Agent 能力

未来 Agent 不只处理文本。

你需要掌握：

- 图像理解

- OCR

- 表格识别

- PDF 解析

- 音频转写

- 语音交互

- 视频理解

- 截图分析

- Computer Use

- Browser Use

- GUI Agent

典型场景：

```Plain Text
读取合同 PDF
分析财务报表
识别网页截图
自动操作后台系统
处理客服录音
从图片中提取表格
生成报告和幻灯片
```

OpenAI、Anthropic 等都在推进更强的 Computer Use、文件操作、工具执行与沙箱能力。\(openai\.com\)

---

# 软件工程基本功

AI Agent 工程师首先仍然是软件工程师。

你需要具备：

- Clean Code

- Git

- 单元测试

- 集成测试

- E2E 测试

- 代码审查

- 设计模式

- API 设计

- 错误处理

- 日志设计

- 性能优化

- 并发编程

- 事务处理

- 幂等性

- 分布式系统基础

Agent 系统的不确定性更高，因此更需要工程基本功兜底。

---

# 产品与业务流程建模能力

很多 Agent 项目失败，不是模型不够强，而是业务流程没建模清楚。

你需要能回答：

```Plain Text
用户是谁？
任务是什么？
输入是什么？
输出是什么？
成功标准是什么？
失败时怎么办？
哪些步骤需要人审批？
哪些工具可以自动调用？
哪些数据不能访问？
怎样衡量 ROI？
```

你需要掌握：

- 需求分析

- 用户旅程

- 业务流程图

- SOP 拆解

- 任务分解

- 异常路径设计

- 人机协作设计

- ROI 评估

- MVP 设计

优秀的 Agent 工程师要能把一句话需求：

> 做一个销售助手。
> 
> 

拆成：

```Plain Text
线索查询
客户画像
邮件生成
CRM 更新
会议纪要
跟进提醒
商机评分
主管审批
结果追踪
```

---

# 推荐技术栈组合

## Python 路线

适合偏后端、RAG、数据、企业集成。

```Plain Text
Python
FastAPI
LangGraph
OpenAI Agents SDK
LlamaIndex
PostgreSQL
pgvector
Redis
Celery
Docker
LangSmith / Langfuse
AWS / GCP
```

## TypeScript 路线

适合偏全栈、Web 应用、SaaS 产品。

```Plain Text
TypeScript
Next.js
React
Node.js / NestJS
Vercel AI SDK
OpenAI SDK
LangChain.js
PostgreSQL
Prisma
Redis
BullMQ
Tailwind CSS
Docker
```

## 企业级 Agent 路线

适合中大型公司内部系统。

```Plain Text
Python + TypeScript
FastAPI + Next.js
LangGraph
MCP
PostgreSQL + pgvector
Redis + Kafka
Kubernetes
OpenTelemetry
LangSmith / Datadog / Langfuse
OAuth / OIDC
RBAC / ABAC
Terraform
```

---

# 最值得优先学习的技能 Top 20

如果你想高效准备“全栈 AI Agent 开发工程师”岗位，我建议按这个顺序学：

1. **Python 或 TypeScript**

2. **OpenAI / Anthropic / Gemini API**

3. **Function Calling / Tool Calling**

4. **Structured Outputs / JSON Schema**

5. **LangGraph 或 OpenAI Agents SDK**

6. **RAG 基础与向量数据库**

7. **FastAPI 或 Next\.js**

8. **PostgreSQL \+ Redis**

9. **MCP Server 开发**

10. **Agent Workflow 设计**

11. **Streaming UI / Chat UI**

12. **Prompt 与 Context Engineering**

13. **LLM Evaluation**

14. **Tracing / Observability**

15. **Prompt Injection 与 Agent Security**

16. **Docker / CI/CD**

17. **异步任务队列**

18. **权限系统 RBAC / OAuth**

19. **成本、延迟与缓存优化**

20. **业务流程拆解与人机协作设计**

---

# 岗位能力分层

## 初级 AI Agent 开发工程师

你应能做到：

- 调用 LLM API

- 写基础 prompt

- 实现 Chatbot

- 做简单 RAG

- 接入 2 到 3 个工具

- 实现基础前后端

- 部署一个 demo

## 中级 AI Agent 开发工程师

你应能做到：

- 构建多工具 Agent

- 使用 LangGraph / Agents SDK

- 实现权限感知 RAG

- 支持 streaming

- 做 tool retry / timeout

- 加入日志和 trace

- 设计异步任务

- 处理生产环境错误

- 做基础 eval

## 高级 AI Agent / Agentic AI Engineer

你应能做到：

- 设计生产级 Agent 架构

- 构建多 Agent 工作流

- 搭建评测体系

- 做线上观测和回归测试

- 设计安全边界和权限模型

- 控制成本和延迟

- 构建 MCP 工具体系

- 设计人机协作流程

- 对业务结果负责

---

# 一个实战项目组合建议

如果你想找工作，建议做 3 个项目：

## 项目一：企业知识库 Agent

功能包括：

```Plain Text
文档上传
PDF 解析
Embedding
向量检索
Hybrid Search
引用溯源
权限控制
多轮问答
评测集
可观测 trace
```

## 项目二：销售 / 客服 Agent

功能包括：

```Plain Text
CRM 查询
客户画像
邮件生成
工单创建
人类审批
工具调用日志
失败重试
SLA 监控
```

## 项目三：代码开发 Agent / DevOps Agent

功能包括：

```Plain Text
GitHub Issue 分析
代码检索
生成 PR
运行测试
CI/CD 集成
Pull Request 总结
安全扫描
人工确认后提交
```

这三个项目基本覆盖：

```Plain Text
RAG
Tool Calling
MCP
Workflow
Frontend
Backend
Security
Evaluation
Observability
Deployment
```

---

# 结论

如果用一句话总结，2026 年成为**全栈 AI Agent 开发工程师**最需要的能力是：

> **用扎实的软件工程能力，把大模型、工具、数据、权限、评测和业务流程组合成稳定、可控、可观测、可迭代的生产级 Agent 系统。**
> 
> 

最重要的不是会写几个 prompt，而是掌握：

```Plain Text
Agent 编排
工具调用
RAG
MCP
评测
观测
安全
全栈工程
业务落地
```

如果你只能优先学 5 个方向，建议是：

1. **Tool Calling / MCP**

2. **RAG / 知识库工程**

3. **LangGraph / Agents SDK**

4. **Evaluation / Observability**

5. **FastAPI \+ Next\.js 全栈开发**

---

Learn more:

1. [Tools \- OpenAI Agents SDK](https://openai.github.io/openai-agents-python/tools/?utm_source=openai)

2. [Function Calling in the OpenAI API \| OpenAI Help Center](https://help.openai.com/en/articles/8555517-function-calling-in-the-openai-api?utm_source=openai)

3. [How are AI agents used? Evidence from 177,000 MCP tools](https://arxiv.org/abs/2603.23802?utm_source=openai)

4. [Evaluating AI Agents at the Run, Trace, and Thread Level](https://www.langchain.com/resources/agent-evals?utm_source=openai)

5. [State of AI Agents](https://www.langchain.com/state-of-agent-engineering?utm_source=openai)

6. [The next evolution of the Agents SDK \| OpenAI](https://openai.com/index/the-next-evolution-of-the-agents-sdk/?utm_source=openai)

