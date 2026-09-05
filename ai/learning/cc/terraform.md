
下面给你一份**面向传统运维/云运维/SRE 的 Terraform 学习路线图**：先理解核心概念，再对比传统运维方式，最后给出快速上手路径和高质量资料。

---

# 1. Terraform 是什么？

**Terraform 是一种 Infrastructure as Code，IaC，基础设施即代码工具。**

它允许你用声明式配置文件描述基础设施，例如：

- 云服务器
- VPC / 子网 / 路由表
- 负载均衡器
- 安全组 / 防火墙规则
- 数据库
- Kubernetes 集群
- DNS 记录
- IAM 权限
- SaaS 资源，例如 GitHub、Datadog、Cloudflare 等

Terraform 的核心思想是：

> 你写代码描述“最终想要什么状态”，Terraform 负责计算“当前状态到目标状态之间需要做什么变更”。

官方介绍中也强调，Terraform 可以通过大量 provider 管理不同云、基础设施和服务资源。([developer.hashicorp.com](https://developer.hashicorp.com/terraform/intro?utm_source=openai))

---

# 2. Terraform 的重要概念

## 2.1 Provider：供应商插件

Provider 是 Terraform 和外部平台交互的插件。

例如：

```hcl
provider "aws" {
  region = "us-east-1"
}
```

常见 provider：

| Provider       | 管理对象                |
| -------------- | ----------------------- |
| `aws`        | AWS 资源                |
| `azurerm`    | Azure 资源              |
| `google`     | Google Cloud 资源       |
| `kubernetes` | Kubernetes 资源         |
| `helm`       | Helm Release            |
| `cloudflare` | DNS / CDN / WAF         |
| `github`     | GitHub 仓库、团队、权限 |
| `datadog`    | 监控、Dashboard、告警   |

Terraform Registry 提供大量官方、合作伙伴和社区 provider；使用 Registry 中的 provider 时，通常只需要在配置中声明，`terraform init` 会自动下载。([developer.hashicorp.com](https://developer.hashicorp.com/terraform/registry/providers?utm_source=openai))

---

## 2.2 Resource：资源

Resource 是 Terraform 管理的基础设施对象。

例如创建一个 AWS EC2：

```hcl
resource "aws_instance" "web" {
  ami           = "ami-xxxxxx"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

可以理解为：

```text
resource "资源类型" "本地名称" {
  参数 = 值
}
```

例如：

```hcl
resource "aws_vpc" "main" {}
resource "aws_subnet" "public" {}
resource "aws_security_group" "web" {}
```

---

## 2.3 Data Source：数据源

Data Source 用来读取已经存在的资源或外部信息。

例如查询一个已有 AMI：

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true

  owners = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*"]
  }
}
```

Resource 是“我要创建/管理资源”。

Data Source 是“我要读取已有信息”。

---

## 2.4 State：状态文件

State 是 Terraform 最关键的概念之一。

Terraform 会用 state 记录：

- 你创建了哪些资源
- Terraform 资源名和真实云资源 ID 的映射关系
- 当前资源属性
- 依赖关系
- 敏感信息的一部分引用

默认状态文件是：

```text
terraform.tfstate
```

例如 Terraform 需要知道：

```text
aws_instance.web -> i-0123456789abcdef
aws_vpc.main     -> vpc-123456
```

没有 state，Terraform 就不知道它之前管理了什么。

**传统运维最容易踩坑的地方就是 state。**

重要原则：

1. 不要随便删除 state。
2. 团队协作不要把本地 state 当生产标准。
3. 生产环境应使用 remote backend，例如 S3 + DynamoDB Lock、Terraform Cloud、Azure Storage、GCS 等。
4. state 可能包含敏感信息，要保护访问权限。
5. 尽量不要手工改 state，除非你知道自己在做什么。

---

## 2.5 Backend：状态存储后端

Backend 决定 Terraform state 存在哪里。

本地 backend：

```text
terraform.tfstate
```

远程 backend 例子：

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/network/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}
```

远程 backend 的作用：

- 多人协作
- 状态集中管理
- 状态锁定，防止多人同时 apply
- 更安全的权限控制
- 方便 CI/CD 集成

---

## 2.6 Plan：执行计划

`terraform plan` 会告诉你 Terraform 准备做什么。

例如：

```bash
terraform plan
```

输出可能包括：

```text
Plan: 2 to add, 1 to change, 0 to destroy.
```

这是 Terraform 的核心价值之一。

在传统运维里，脚本通常是直接执行。

在 Terraform 里，推荐流程是：

```bash
terraform plan
# 人工或自动审核
terraform apply
```

也就是先预览，再执行。

---

## 2.7 Apply：执行变更

```bash
terraform apply
```

Terraform 根据 plan 执行资源创建、修改或删除。

也可以先保存 plan：

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

在生产 CI/CD 里，这种方式更安全。

---

## 2.8 Destroy：销毁资源

```bash
terraform destroy
```

会删除 Terraform 管理的资源。

生产环境慎用。

也可以只删除某个资源，但一般不推荐频繁用 target：

```bash
terraform destroy -target=aws_instance.web
```

---

## 2.9 Variables：变量

变量用于参数化配置。

```hcl
variable "instance_type" {
  type    = string
  default = "t3.micro"
}
```

使用：

```hcl
resource "aws_instance" "web" {
  instance_type = var.instance_type
}
```

赋值方式：

```bash
terraform apply -var="instance_type=t3.small"
```

或使用：

```text
terraform.tfvars
```

```hcl
instance_type = "t3.small"
```

---

## 2.10 Outputs：输出

Output 用于输出资源信息。

```hcl
output "instance_public_ip" {
  value = aws_instance.web.public_ip
}
```

执行后可以看到：

```text
instance_public_ip = "1.2.3.4"
```

常用于：

- 输出负载均衡器地址
- 输出数据库 endpoint
- 输出 VPC ID
- 给其他 Terraform 项目引用

---

## 2.11 Module：模块

Module 是 Terraform 的复用单元。

一个简单目录：

```text
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf
```

调用模块：

```hcl
module "vpc" {
  source = "./modules/vpc"

  cidr_block = "10.0.0.0/16"
}
```

Terraform Registry 中也有很多可复用模块；官方文档说明 Terraform Registry 可以直接被 Terraform 配置引用，`terraform init` 会下载所需模块。([developer.hashicorp.com](https://developer.hashicorp.com/terraform/registry/modules/use?utm_source=openai))

模块适合封装：

- VPC
- EKS / AKS / GKE
- RDS
- IAM Role
- 标准安全组
- 监控告警
- 项目模板

---

## 2.12 Dependency Graph：依赖图

Terraform 会自动分析资源依赖。

例如：

```hcl
resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
}
```

因为 `aws_subnet.public` 引用了 `aws_vpc.main.id`，Terraform 知道必须先创建 VPC，再创建 Subnet。

必要时也可以显式声明：

```hcl
depends_on = [aws_iam_role_policy_attachment.example]
```

但不要滥用 `depends_on`。

---

## 2.13 Workspace：工作区

Workspace 可以在同一套配置下维护多份 state。

```bash
terraform workspace new dev
terraform workspace new prod
terraform workspace select dev
```

不过在企业实践中，很多团队更推荐用目录或独立 root module 区分环境：

```text
envs/
  dev/
  staging/
  prod/
```

而不是过度依赖 workspace。

---

## 2.14 Import：导入已有资源

如果你已经手工创建了资源，可以用 import 纳入 Terraform 管理。

例如：

```bash
terraform import aws_instance.web i-0123456789abcdef
```

导入后还需要你自己写对应的 `.tf` 配置，确保配置和真实资源一致。

新版 Terraform 已支持更好的 import block 工作流，但实际生产里仍然需要谨慎验证。

---

## 2.15 Drift：配置漂移

Drift 是指真实环境和 Terraform 配置/state 不一致。

比如某人手工在控制台改了安全组端口。

Terraform 下次 plan 会发现：

```text
~ security_group rule will be updated
```

Terraform 可以帮助团队发现和修正漂移。

---

# 3. Terraform 和传统运维的相同点

Terraform 不是完全替代运维经验，它是把很多运维动作代码化。

## 相同点

| 传统运维     | Terraform 中对应                                     |
| ------------ | ---------------------------------------------------- |
| 创建服务器   | `aws_instance` / `azurerm_linux_virtual_machine` |
| 配置网络     | VPC、Subnet、Route Table、Security Group             |
| 配置负载均衡 | ELB、ALB、NLB、Azure LB                              |
| 管理 DNS     | Route53、Cloudflare Provider                         |
| 管理权限     | IAM Role、Policy、User                               |
| 配置数据库   | RDS、Cloud SQL、Azure DB                             |
| 环境隔离     | dev/staging/prod 目录或 workspace                    |
| 变更审批     | plan 审核、PR Review                                 |
| 回滚         | Git 回滚配置 + 重新 apply                            |
| 审计         | Git 历史 + CI/CD 日志 + CloudTrail                   |

所以你的传统运维能力仍然非常重要：

- 网络规划
- 安全组规则
- IAM 最小权限
- 高可用架构
- 容灾设计
- 成本优化
- 监控告警
- 故障排查
- 变更管理

Terraform 只是把这些能力变成可版本化、可审查、可复用的代码。

---

# 4. Terraform 和传统运维的主要差别

## 4.1 手工操作 vs 声明式代码

传统方式：

```text
登录控制台 -> 点按钮 -> 创建资源
```

Terraform：

```hcl
resource "aws_instance" "web" {
  instance_type = "t3.micro"
}
```

区别：

| 传统运维                   | Terraform        |
| -------------------------- | ---------------- |
| 以人为中心                 | 以代码为中心     |
| 操作步骤记录在文档或脑子里 | 状态描述在代码里 |
| 容易遗漏步骤               | 可重复执行       |
| 容易环境不一致             | 易于标准化       |
| 审计困难                   | Git 可追踪       |

---

## 4.2 命令式 vs 声明式

传统脚本常见是命令式：

```bash
aws ec2 create-vpc ...
aws ec2 create-subnet ...
aws ec2 create-route-table ...
```

你告诉系统“每一步怎么做”。

Terraform 是声明式：

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

你告诉系统“我想要什么结果”。

Terraform 自己计算执行顺序。

---

## 4.3 资源生命周期管理方式不同

传统运维可能只关心“创建”。

Terraform 关心完整生命周期：

```text
create -> update -> replace -> destroy
```

有些字段变更会导致原地更新，有些字段变更会导致资源重建。

例如改 EC2 的某些属性可能会触发 replacement。

所以必须认真看 `terraform plan`。

---

## 4.4 状态文件是核心资产

传统脚本不一定需要持久状态。

Terraform 必须依赖 state。

这带来好处：

- 能追踪资源
- 能做差异对比
- 能检测漂移
- 能管理依赖

也带来风险：

- state 丢失会很麻烦
- state 泄露可能暴露敏感信息
- 多人同时 apply 可能冲突
- 手工改云资源可能造成 drift

---

## 4.5 不适合做主机内部配置管理

Terraform 更适合管理基础设施资源，不适合替代 Ansible、Chef、Puppet 做大量系统内部配置。

推荐边界：

| 任务                               | 更适合工具              |
| ---------------------------------- | ----------------------- |
| 创建 VPC、服务器、数据库、LB       | Terraform               |
| 安装 Nginx、修改配置文件、启动服务 | Ansible                 |
| 构建镜像                           | Packer / Docker         |
| 部署 Kubernetes 应用               | Helm / Argo CD / Flux   |
| 管理云资源生命周期                 | Terraform               |
| 持续配置主机状态                   | Ansible / Salt / Puppet |

当然 Terraform 有 `user_data`、`remote-exec`、`local-exec`，但不建议大量依赖 provisioner。

---

# 5. Terraform 基本工作流

官方 CLI 教程也强调，`terraform init` 会初始化 backend、安装 providers、下载 modules 等。([developer.hashicorp.com](https://developer.hashicorp.com/terraform/tutorials/cli?utm_source=openai))

常用工作流：

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
terraform destroy
```

含义：

| 命令                     | 作用                                           |
| ------------------------ | ---------------------------------------------- |
| `terraform init`       | 初始化目录，下载 provider/module，配置 backend |
| `terraform fmt`        | 格式化`.tf` 文件                             |
| `terraform validate`   | 校验语法和配置                                 |
| `terraform plan`       | 生成执行计划                                   |
| `terraform apply`      | 执行变更                                       |
| `terraform destroy`    | 销毁资源                                       |
| `terraform state list` | 查看 state 中的资源                            |
| `terraform output`     | 查看输出                                       |
| `terraform import`     | 导入已有资源                                   |
| `terraform taint`      | 标记资源重建，较少用                           |
| `terraform graph`      | 输出依赖图                                     |

---

# 6. 一个最小 Terraform 示例

以 AWS 为例：

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "demo-vpc"
  }
}

output "vpc_id" {
  value = aws_vpc.main.id
}
```

执行：

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

---

# 7. 推荐目录结构

## 初学阶段

```text
terraform-demo/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars
```

## 稍微规范一点

```text
terraform/
  envs/
    dev/
      main.tf
      variables.tf
      outputs.tf
      terraform.tfvars
    staging/
      main.tf
      variables.tf
      outputs.tf
      terraform.tfvars
    prod/
      main.tf
      variables.tf
      outputs.tf
      terraform.tfvars
  modules/
    vpc/
      main.tf
      variables.tf
      outputs.tf
    ec2/
      main.tf
      variables.tf
      outputs.tf
```

## 企业常见结构

```text
infra-live/
  prod/
    networking/
    compute/
    database/
    security/
  staging/
    networking/
    compute/
    database/
    security/
  dev/
    networking/
    compute/
    database/
    security/

infra-modules/
  vpc/
  eks/
  rds/
  iam/
  alb/
```

---

# 8. 快速上手学习路径

## 阶段 0：准备基础

如果你是传统运维，建议先补齐：

- Linux 基础
- Git 基础
- YAML/JSON 基础
- 云平台基本概念
- 网络基础：CIDR、路由、NAT、安全组
- IAM 权限模型
- Shell 基础

如果你已经做过云运维，这一步可以跳过。

---

## 阶段 1：Terraform 入门，1-2 天

目标：知道 Terraform 是什么，会跑基本命令。

学习内容：

1. 安装 Terraform CLI。
2. 理解 `.tf` 文件。
3. 学会 `init`、`plan`、`apply`、`destroy`。
4. 创建一个本地或云端资源。
5. 理解 provider、resource、variable、output。

练习：

- 使用 Docker provider 创建一个 Nginx 容器。
- 或用 AWS 创建一个 VPC。
- 或用 Azure 创建一个 Resource Group。
- 或用 Google Cloud 创建一个 Storage Bucket。

推荐资源：

- HashiCorp 官方 Terraform Get Started 教程。([developer.hashicorp.com](https://developer.hashicorp.com/tutorials?utm_source=openai))
- Terraform CLI 官方教程。([developer.hashicorp.com](https://developer.hashicorp.com/terraform/tutorials/cli?utm_source=openai))

---

## 阶段 2：核心概念，3-5 天

目标：理解 Terraform 真正工作的机制。

重点学习：

- Provider
- Resource
- Data Source
- State
- Backend
- Lock
- Variables
- Outputs
- Dependencies
- Lifecycle
- Import
- Drift

练习：

1. 创建 VPC、Subnet、Security Group、EC2。
2. 修改实例类型，观察 plan。
3. 手工在控制台改 tag，观察 drift。
4. 删除 `.tf` 中一个资源，观察 plan。
5. 使用 `terraform import` 导入已有资源。
6. 把本地 state 迁移到 remote backend。

---

## 阶段 3：模块化，3-7 天

目标：会写可复用 Terraform 模块。

学习内容：

- root module
- child module
- module input/output
- module versioning
- module source
- public registry module
- private module

练习：

1. 写一个 VPC 模块。
2. 写一个 EC2 模块。
3. 写一个 Security Group 模块。
4. 在 dev/staging/prod 中复用。
5. 给模块添加变量校验。

推荐资源：

- Terraform Registry Modules 官方文档。([developer.hashicorp.com](https://developer.hashicorp.com/terraform/registry/modules/use?utm_source=openai))
- Terraform Registry。([registry.terraform.io](https://registry.terraform.io/?product_intent=terraform&utm_source=openai))

---

## 阶段 4：团队协作和生产实践，1-2 周

目标：能把 Terraform 用在真实团队中。

学习内容：

- Remote State
- State Lock
- CI/CD 集成
- PR Review
- Plan 审核
- 多环境管理
- 变量和密钥管理
- 权限隔离
- 模块版本管理
- 代码规范
- Policy as Code
- Drift Detection

练习：

1. 把 Terraform 接入 GitHub Actions / GitLab CI。
2. PR 时自动执行 `terraform fmt`、`validate`、`plan`。
3. Merge 后手动审批再 `apply`。
4. 使用 S3 + DynamoDB 做 backend。
5. 模块发布版本，例如 Git tag：`v1.0.0`。
6. 使用 `tflint`、`checkov`、`tfsec` 等做静态检查。

---

## 阶段 5：进阶架构，持续学习

目标：能够设计大规模 IaC 架构。

学习内容：

- 多账号 / 多订阅 / 多项目管理
- Landing Zone
- 多区域部署
- 跨模块依赖
- remote state data source
- Terragrunt
- OpenTofu
- Terraform Cloud / HCP Terraform
- Sentinel / OPA
- 大规模 state 拆分
- Provider 版本升级
- 资源导入和重构
- 模块设计规范
- 平台工程 self-service 模式

---

# 9. 建议的 2 周速成计划

## 第 1 天：理解 Terraform

- 看官方 What is Terraform。
- 安装 Terraform。
- 跑一个最小示例。
- 学会 `init / plan / apply / destroy`。

## 第 2 天：Resource、Variable、Output

- 写 3 个 resource。
- 使用变量。
- 使用 output。
- 使用 `terraform.tfvars`。

## 第 3 天：State

- 查看 `terraform.tfstate`。
- 执行 `terraform state list`。
- 手工修改云资源，观察 drift。
- 理解 state 重要性。

## 第 4 天：Backend

- 配置远程 backend。
- 理解 state lock。
- 模拟多人协作场景。

## 第 5 天：网络资源

- 创建 VPC。
- 创建 subnet。
- 创建 route table。
- 创建 security group。

## 第 6 天：计算资源

- 创建 VM/EC2。
- 配置 tag。
- 配置 user_data。
- 输出 IP。

## 第 7 天：复盘和整理

- 把代码整理成标准结构。
- 写 README。
- 记录常用命令。

## 第 8-10 天：模块

- 写 VPC 模块。
- 写 EC2 模块。
- 写安全组模块。
- 在不同环境复用。

## 第 11-12 天：CI/CD

- GitHub Actions 或 GitLab CI。
- PR 自动 plan。
- apply 需要人工审批。

## 第 13 天：导入已有资源

- 选择一个已有资源。
- 使用 import。
- 对齐配置。
- 确保 plan 无差异。

## 第 14 天：最佳实践

- 加 tflint。
- 加安全扫描。
- 写模块版本规范。
- 总结团队使用规范。

---

# 10. 高质量学习资料

## 官方资料，优先级最高

### 1. Terraform 官方入门教程

适合新手从零开始。

HashiCorp 官方教程覆盖基础、CLI、云 provider、模块、state 等主题。([developer.hashicorp.com](https://developer.hashicorp.com/tutorials?utm_source=openai))

---

### 2. Terraform 官方文档

适合系统查概念和语法。

重点看：

- What is Terraform
- Terraform Language
- Providers
- Resources
- State
- Backend
- Modules
- CLI

官方 Terraform 页面提供不同云平台的入门教程，如 AWS、Azure、Google Cloud、OCI、Docker 等。([developer.hashicorp.com](https://developer.hashicorp.com/terraform?utm_source=openai))

---

### 3. Terraform Registry

日常工作必用。

用来查：

- provider 文档
- resource 参数
- data source 参数
- module 用法
- provider 版本

Terraform Registry 是查询 provider 和 module 的核心入口。([registry.terraform.io](https://registry.terraform.io/browse/providers?utm_source=openai))

---

## 书籍

### 1. 《Terraform: Up & Running》

非常经典，适合从入门到工程实践。

适合关注：

- 模块设计
- 多环境管理
- state 管理
- 生产实践
- 团队协作

### 2. 《Infrastructure as Code》

这本更偏理念，不只讲 Terraform。

适合想理解 IaC 思想的人。

---

## 视频课程

### 1. HashiCorp 官方 YouTube

适合看概念、演示和新特性。

官方有 Terraform Basics、Introduction to Terraform 等视频内容。([youtube.com](https://www.youtube.com/watch?v=_45W3Z8XWL4&utm_source=openai))

### 2. KodeKloud Terraform

适合需要实验环境、任务驱动学习的人。

### 3. freeCodeCamp Terraform Course

适合入门视频学习。

### 4. Bryan Krausen Terraform Course

社区里口碑不错，适合备考和系统学习。

---

## 实战练习平台

### 1. HashiCorp Learn / Tutorials

首选。

官方教程是最稳定、最权威的入门材料。([developer.hashicorp.com](https://developer.hashicorp.com/tutorials?utm_source=openai))

### 2. KodeKloud Labs

适合通过浏览器实验。

### 3. A Cloud Guru / Pluralsight

适合云平台结合 Terraform 学习。

### 4. Instruqt Labs

很多 HashiCorp 官方实验环境基于 Instruqt。

---

## GitHub 资源

建议搜索并关注：

- `terraform-aws-modules`
- `awesome-terraform`
- `gruntwork-io`
- `cloudposse`
- `antonbabenko terraform modules`

其中 `terraform-aws-modules` 是 AWS 生态里非常常用的开源模块集合。

---

# 11. Terraform 最佳实践清单

## 代码组织

- 每个环境单独 state。
- 每个大组件单独 root module。
- 公共逻辑抽成 child module。
- 不要把所有资源塞进一个巨大 state。
- 模块要有清晰的 `variables.tf` 和 `outputs.tf`。
- 给变量加类型和说明。

示例：

```hcl
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}
```

---

## State 管理

- 生产环境必须使用 remote backend。
- 开启 state lock。
- backend 存储开启加密。
- 限制 state 访问权限。
- 不要把 state 提交到 Git。
- 不要手工编辑 state。
- 定期备份 state。

---

## 版本管理

固定 Terraform 版本：

```hcl
terraform {
  required_version = "~> 1.8.0"
}
```

固定 provider 版本：

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

提交 `.terraform.lock.hcl` 到 Git。

---

## 安全

- 不要把密钥写进 `.tf` 文件。
- 不要把敏感变量提交到 Git。
- 使用 Vault、云 Secret Manager、CI Secret。
- State 权限要严格控制。
- IAM 使用最小权限。
- 对 PR 做安全扫描。
- 对开放端口做审查。

---

## CI/CD

推荐流程：

```text
开发分支提交 Terraform 代码
        |
        v
PR 触发 terraform fmt/validate/plan
        |
        v
人工 Review plan
        |
        v
合并到 main
        |
        v
人工批准 apply
        |
        v
生产变更
```

---

# 12. 常见坑

## 12.1 手工改云资源

问题：

```text
Terraform 配置和实际资源不一致
```

后果：

- 下次 apply 可能把手工修改覆盖掉。
- 或者出现不可预期 diff。

建议：

- 生产资源只通过 Terraform 改。
- 必须手工改时，事后同步代码。
- 定期做 drift detection。

---

## 12.2 state 丢失

后果严重。

建议：

- remote backend。
- 版本化存储。
- 加密。
- 定期备份。

---

## 12.3 模块过度抽象

不要一开始就抽象十层模块。

建议：

1. 先写直接可用的 root module。
2. 重复 2-3 次后再抽象。
3. 模块接口要稳定。
4. 不要把所有云资源都封装成“万能模块”。

---

## 12.4 滥用 `count`

`count` 在资源顺序变化时容易造成误删误建。

更推荐：

```hcl
for_each = var.instances
```

示例：

```hcl
resource "aws_instance" "web" {
  for_each = var.instances

  ami           = each.value.ami
  instance_type = each.value.instance_type
}
```

---

## 12.5 忽略 plan

永远认真看 plan，尤其是：

```text
-/+ destroy and then create replacement
```

这表示资源会被替换。

生产环境里这可能意味着中断。

---

## 12.6 把 Terraform 当 Ansible 用

不建议大量使用：

```hcl
provisioner "remote-exec" {}
provisioner "local-exec" {}
```

Terraform 应该负责基础设施生命周期，不应该承担复杂配置管理。

---

# 13. 传统运维转 Terraform 的思维转换

## 从“操作机器”转为“描述状态”

传统：

```text
我要登录控制台创建一台机器。
```

Terraform：

```text
我的环境中应该存在一台符合这些参数的机器。
```

---

## 从“写执行脚本”转为“写资源模型”

传统脚本：

```bash
create-vpc
create-subnet
create-instance
```

Terraform：

```hcl
resource "aws_vpc" "main" {}
resource "aws_subnet" "public" {}
resource "aws_instance" "web" {}
```

---

## 从“变更靠经验”转为“变更靠 diff”

传统变更：

```text
我记得我只改了一个安全组。
```

Terraform 变更：

```text
Plan: 0 to add, 1 to change, 0 to destroy.
```

---

## 从“文档即事实”转为“代码即事实”

传统：

```text
文档写的是这样，但实际环境可能不是。
```

Terraform：

```text
代码、state、真实环境三者需要保持一致。
```

---

# 14. 你应该先学 AWS/Azure/GCP 还是先学 Terraform？

建议：

如果你已经会某个云：

> 直接用你熟悉的云学 Terraform。

如果你还不会云：

> 先用 Docker provider 或本地 provider 学 Terraform 基本概念，再选一个云深入。

最佳组合：

| 背景       | 建议路径                                     |
| ---------- | -------------------------------------------- |
| Linux 运维 | Docker provider -> AWS/Azure 基础资源        |
| AWS 运维   | AWS VPC/EC2/IAM/RDS Terraform                |
| Azure 运维 | Resource Group/VNet/VM/AKR                   |
| K8s 运维   | Kubernetes provider + Helm provider          |
| 网络运维   | VPC/VNet/Subnet/Route/Security Group         |
| SRE        | Terraform + CI/CD + Policy + Drift Detection |

---

# 15. 推荐实战项目

## 项目 1：最小网络环境

创建：

- VPC
- 2 个 public subnet
- 2 个 private subnet
- Internet Gateway
- NAT Gateway
- Route Table

目标：

- 理解依赖关系
- 理解变量
- 理解 output
- 理解模块

---

## 项目 2：Web 服务基础架构

创建：

- VPC
- Security Group
- EC2
- ALB
- Target Group
- Route53 DNS

目标：

- 理解真实 Web 架构
- 理解安全组
- 理解负载均衡

---

## 项目 3：数据库环境

创建：

- RDS Subnet Group
- RDS Instance
- Security Group
- Parameter Group
- Secret Manager Secret

目标：

- 理解有状态资源
- 理解敏感信息
- 理解生产变更风险

---

## 项目 4：Kubernetes 基础设施

创建：

- EKS / AKS / GKE
- Node Group
- IAM Role
- Helm Controller
- Ingress Controller

目标：

- 理解复杂模块
- 理解云和 K8s 结合

---

## 项目 5：CI/CD 管理 Terraform

创建：

- GitHub Actions
- PR 自动 plan
- main 分支 apply
- 手工 approval
- tflint/checkov 扫描

目标：

- 掌握团队协作实践

---

# 16. 我的建议学习顺序

如果你想最快进入工作状态，按这个顺序学：

```text
1. Terraform 基本命令
2. Provider / Resource / Variable / Output
3. State / Backend / Lock
4. Plan / Apply / Destroy
5. Data Source / Dependency
6. Module
7. 多环境目录结构
8. Remote State
9. Import
10. CI/CD
11. 安全扫描和规范
12. 大规模架构实践
```

不要一开始就陷入：

- Terragrunt
- Sentinel
- Provider 开发
- 复杂模块抽象
- 多云统一平台

这些可以后面再学。

---

# 17. 一句话总结

Terraform 对传统运维最大的改变是：

> 以前你是“手工操作基础设施”，现在你是“用代码描述基础设施状态，并通过 plan/apply 安全地收敛到目标状态”。

如果你是传统运维出身，最需要重点掌握的是：

1. **State**
2. **Plan**
3. **Provider**
4. **Module**
5. **Remote Backend**
6. **Drift**
7. **CI/CD 工作流**
8. **不要手工改生产资源**

只要这几个概念掌握扎实，Terraform 上手会非常快。

---

Learn more:

1. [What is Terraform | Terraform | HashiCorp Developer](https://developer.hashicorp.com/terraform/intro?utm_source=openai)
2. [Providers overview for the Terraform registry | Terraform | HashiCorp Developer](https://developer.hashicorp.com/terraform/registry/providers?utm_source=openai)
3. [Find and use modules in the Terraform registry | Terraform | HashiCorp Developer](https://developer.hashicorp.com/terraform/registry/modules/use?utm_source=openai)
4. [CLI | Terraform | HashiCorp Developer](https://developer.hashicorp.com/terraform/tutorials/cli?utm_source=openai)
5. [Tutorials | HashiCorp Developer](https://developer.hashicorp.com/tutorials?utm_source=openai)
6. [Terraform Registry](https://registry.terraform.io/?product_intent=terraform&utm_source=openai)
7. [Terraform | HashiCorp Developer](https://developer.hashicorp.com/terraform?utm_source=openai)
8. [Browse Providers | Terraform Registry](https://registry.terraform.io/browse/providers?utm_source=openai)
9. [Terraform Basics - YouTube](https://www.youtube.com/watch?v=_45W3Z8XWL4&utm_source=openai)
