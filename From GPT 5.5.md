下面给出一个**从 CA 1 / TMS 15 迁移到 IBM DFSMSrmm / RMM on z/OS 3.1** 的项目级迁移方案。以下内容假设你们是大型商业生产环境，运行多年，逻辑磁带数量大，可能包含 VTS/TS7700、物理库、HSM、备份软件、批量作业、外送库、DR 流程和多 LPAR / Sysplex 环境。

> 注：IBM 对 **CA-1 到 DFSMSrmm** 有专门 Redbook《Converting to DFSMSrmm from CA-1》，覆盖规划、数据抽取、构建 CDS、并行验证、切换、策略管理等主题；z/OS 3.1 官方文档也将 DFSMSrmm 作为 DFSMS 的 Removable Media Manager 组件进行实施说明。([redbooks.ibm.com](https://www.redbooks.ibm.com/abstracts/sg246241.html?utm_source=openai))

---

# 一、总体迁移目标

## 1. 迁移对象

从现有：

- Broadcom / CA 1 Tape Management System 15
- CA 1 TMC / Audit 文件
- CA 1 Retention / Vault / Scratch 管理规则
- CA 1 出入库、外送、报表、接口、出口程序
- 与 CA 1 集成的应用、批处理、备份、HSM、VTS、Tape Library、机器人库、DR 流程

迁移到：

- IBM DFSMSrmm / RMM on z/OS 3.1
- RMM CDS / Journal / Control data sets
- RMM policy / rack / bin / location / vital record / retention 管理
- RMM 命令、报表、出口、API、ISPF / WUI 等管理方式

---

# 二、迁移原则

建议采用：

## **“评估 → 建模 → 多轮转换 → 并行验证 → 冻结窗口 → 正式切换 → 稳定期双轨验证 → 清理退役”**

而不是一次性切换。

核心原则：

1. **不迁移业务数据本身，只迁移磁带管理元数据。**
    
    - 即 tape volume、dataset、expiration、scratch status、vault location、owner、creation date、last reference、sequence 等信息。
    - 物理磁带/虚拟磁带本身不做 mass copy，除非发现介质、命名、库管理或灾备策略需要调整。
2. **CA 1 TMC 在切换前必须保持为最终可信源。**

    - 所有试转换都从 CA 1 TMC / Audit / Report 中抽取。
    - RMM 测试 CDS 只用于验证，不参与生产 tape allocation。
3. **正式 cutover 前必须冻结 tape 相关变更。**
    
    - 包括新建 tape、scratch、vault movement、外送、HSM migrate / recycle、备份窗口等。
4. **必须保留可回退能力。**
    
    - CA 1 TMC、Audit、parmlib、proclib、exit、JCL、SMF、报表至少保留完整备份。
    - 切换窗口内必须有明确 fallback decision point。
5. **迁移不能只看 volume 数量，要看业务行为。**
    
    - DFSMSrmm 与 CA 1 的策略模型、保留期、scratch、vault、location、catalog 关系和自动化行为并非一一等价。

---

# 三、项目阶段规划

## 阶段 0：项目启动与治理

### 主要任务

- 建立迁移项目组：
    - z/OS storage admin
    - tape library / TS7700 管理员
    - CA 1 管理员
    - DFSMSrmm / IBM 支持
    - RACF / security 管理员
    - JES / automation 管理员
    - HSM / backup 产品管理员
    - application batch owner
    - operations / tape ops
    - DR / BCP 团队
- 明确环境范围：
    - 哪些 LPAR / Sysplex
    - 哪些 tape libraries
    - 是否共享 tape catalog
    - 是否跨系统共享 TMC
    - 是否有 z/VM、VSE、Linux on Z 或其他平台使用磁带
- 定义迁移成功标准：
    - 生产作业无异常 tape mount / allocation failure
    - RMM 中 volume / dataset 数量与 CA 1 基线一致
    - scratch pool 可用
    - HSM / backup / restore 正常
    - DR tape 可识别、可定位、可恢复
    - vault movement 正常
    - 报表和审计满足合规要求

### 交付物

- 项目章程
- 环境清单
- 风险登记表
- 迁移总体时间表
- 回退原则
- 变更窗口草案

---

## 阶段 1：现状盘点

这是整个项目最关键的阶段。

### 1. CA 1 数据盘点

需要从 CA 1 中导出或报表化以下信息：

#### Volume 层面

- VOLSER
- 状态：
    - active
    - scratch
    - deleted
    - vault
    - foreign
    - cleaning / diagnostic / special use
- media type
- recording technology
- robot / manual / virtual
- current location
- home location
- slot / rack / bin
- owner
- create date
- expiration date
- last used date
- last referenced date
- cycle / generation
- pool / range
- retention policy
- EDM / external data manager 标记
- multivolume relationship
- multisequence dataset relationship

#### Dataset 层面

- DSN
- VOLSER
- file sequence
- creation date
- expiration date
- catalog status
- job name / step name / program
- creating system
- retention rule source
- GDG 关联
- 是否 uncataloged
- 是否 HSM / backup / archive / application private format

#### Control 数据

- TMC 参数
- Audit file
- CA 1 options
- retention rules
- vault rules
- scratch rules
- pool / range definitions
- exit routines
- security definitions
- CA 1 command usage
- report jobs
- daily batch jobs

---

### 2. 系统集成盘点

必须确认以下组件是否依赖 CA 1：

|组件|需要检查内容|
|---|---|
|DFSMShsm|ML2 tape、backup tape、recycle、expiration、CDS backup|
|DFSMSdss|dump/restore tape 处理|
|FDR / ABR / DMS|tape retention、vault、EDM 处理|
|Db2 backup|Image copy、archive log、restore 流程|
|IMS|image copy、log archive|
|CICS|journal / backup|
|CA 7 / TWS / Control-M|tape 相关 JCL 和 dependency|
|VTS / TS7700|logical volume、copy policy、grid、scratch behavior|
|ATL / OAM|library definitions、SMS tape classes|
|RACF|FACILITY/STGADMIN/RMM profiles|
|Automation|started task、message rule、mount automation|
|Operations|scratch pull list、vault list、daily report|
|DR|offsite tape inventory、recovery book、restore scripts|

---

### 3. JCL 和应用依赖分析

需要扫描生产 JCL / PROC / INCLUDE / SKELETON：

查找：

```
//*CA1
//TMS
//TMC
//CA1
EXPDT=
RETPD=
LABEL=
UNIT=
VOL=SER=
DISP=
DCB=
```

重点分析：

- 是否硬编码 `EXPDT=99000`、`EXPDT=99365`、`RETPD=9999` 等特殊日期。
- 是否依赖 CA 1 特定 retention 解释。
- 是否使用 CA 1 utility 或 batch command。
- 是否直接读取 TMC。
- 是否有自研报表读取 CA 1 TMC layout。
- 是否使用 CA 1 exit 修改保留期或 vault 位置。
- 是否有程序依赖 CA 1 abend / message。

---

## 阶段 2：差异分析与映射设计

CA 1 和 DFSMSrmm 的概念并不完全一致。需要建立详细 mapping document。

### 1. 术语映射示例

|CA 1 / TMS|DFSMSrmm / RMM|注意事项|
|---|---|---|
|TMC|RMM CDS|数据模型不同，不是简单复制|
|Audit file|RMM journal / backup|日志和恢复机制不同|
|Scratch|Scratch volume|scratch eligibility 规则需验证|
|Retention|Expiration / vital record policy|语义可能不同|
|Vault|Location / rack / bin / VRS|外送规则要重建|
|Volume pool|Pool / storage group / media name / range|需结合 SMS tape ACS|
|EDM|EDM / external manager handling|必须单独设计|
|TMS report|RMM LIST / REPORT / EXTRACT|报表需重写|
|CA 1 exits|RMM exits / ACS / policy|不能逐行照搬|

---

### 2. Retention 策略映射

这是最高风险点之一。

需要逐条分析：

- EXPDT
- RETPD
- catalog control
- GDG retention
- permanent tape
- cycle based retention
- jobname / dsname based retention
- EDM managed tape
- never scratch tape
- disaster recovery tape
- legal hold / compliance hold

建议把 CA 1 retention 规则分成几类：

|类型|迁移策略|
|---|---|
|标准日期过期|映射到 RMM expiration date|
|DSN pattern retention|映射到 RMM policy / VRS|
|Job based retention|尽量迁移为 DSN 或 management class 规则|
|永久保留|建议明确标记为 permanent / never scratch|
|EDM 管理|与对应产品确认，由外部产品控制|
|Vault retention|转换为 RMM location / vital record 规则|
|特殊 EXPDT|逐一建立对应解释表|

---

### 3. Tape pool / VOLSER range 设计

需要确定：

- 每个 VOLSER range 的用途。
- CA 1 pool 与 RMM pool 是否一一对应。
- 是否需要重新划分 logical volume pools。
- scratch pool 是否按介质类型、库、业务、复制策略区分。
- TS7700 logical volume 是否跨 grid / cluster。
- 是否有 WORM、加密磁带、特殊媒体。
- 是否需要保留老 VOLSER range，只新增 RMM 规则。

建议不要在迁移同时大规模重构 VOLSER range。  
最佳实践是：

> **先保持现状迁移成功，再在 RMM 稳定后优化 pool 和策略。**

---

### 4. Vault / Offsite 设计

需要把 CA 1 vault 逻辑转换成 RMM 可管理的：

- LOCATION
- HOMELOCATION
- STORE
- BIN / RACK
- VRS
- move rule
- pull list
- return list
- offsite vendor interface
- DR inventory

特别注意：

- 当前实际外送库库存可能与 CA 1 TMC 不一致。
- 有些 tape 可能已经 physical offsite，但 TMC location 未更新。
- Vault vendor 报表格式可能依赖 CA 1。
- DR recovery book 可能使用 CA 1 report。

---

## 阶段 3：目标 RMM 架构设计

### 1. RMM CDS 设计

需要设计：

- RMM control data set size
- Journal size
- backup strategy
- recovery procedure
- sharing mode
- Sysplex access
- serialization
- performance
- dataset placement
- SMS class
- backup frequency
- disaster recovery copy

建议：

- 使用独立 high-level qualifier。
- CDS / journal 放在高可用 DASD 上。
- 建立每日 full backup 和切换前特殊备份。
- 建立 standalone recovery procedure。
- 在非生产环境先压测 large inventory load。

---

### 2. RMM started task 与参数

需要准备：

- RMM started task PROC
- EDGRMMxx parmlib member
- subsystem 定义
- command prefix
- message routing
- automation rules
- console authority
- startup order
- shutdown procedure
- system symbolics
- SMF / logging options
- CDS backup / journal handling

z/OS 3.1 DFSMSrmm 的实施步骤应按 IBM 官方文档执行，包括 review z/OS upgrade workflow、安装和配置 DFSMSrmm 等。([ibm.com](https://www.ibm.com/docs/en/zos/3.1.0?topic=guide-implementing-dfsmsrmm&utm_source=openai))

---

### 3. SMS / ACS 配置

需要检查或新增：

- SMS tape storage group
- data class
- storage class
- management class
- ACS routines
- library definitions
- OAM / tape library definitions
- device esoterics
- unit names
- media preference
- TS7700 policy
- encryption policy

尤其注意：

- 现有 CA 1 可能通过 exits 或 rules 决定 pool。
- RMM 更常与 SMS ACS 和 policy 结合。
- ACS 变更必须经过模拟测试。
- 不要让新建 tape 被分配到错误 pool 或错误 library。

---

### 4. Security / RACF 设计

需要定义：

- RMM started task user ID
- RMM command authority
- tape admin authority
- operator authority
- read-only auditor authority
- application access
- STGADMIN profiles
- FACILITY class profiles
- dataset profiles for RMM CDS / journal / backup
- console command authority

迁移期间建议建立三类权限：

1. **RMM migration admin**
2. **RMM production operator**
3. **RMM inquiry / audit user**

---

## 阶段 4：转换方法设计

## 推荐方法：IBM 转换工具 + 自定义校验 + 多轮模拟

IBM Redbook 明确涵盖 CA-1 到 DFSMSrmm 的转换，内容包括 IBM 提供的 sample conversion programs、数据验证、构建生产 CDS、并行运行与验证、cutover 等。([redbooks.ibm.com](https://www.redbooks.ibm.com/abstracts/sg246241.html?utm_source=openai))

### 典型转换流程

```text
CA 1 TMC / Audit / Reports
        |
        | 1. Extract
        v
CA 1 extract files
        |
        | 2. Normalize / Clean / Map
        v
Intermediate conversion records
        |
        | 3. Build / Load RMM CDS
        v
Test RMM CDS
        |
        | 4. Validate
        v
Accepted RMM CDS
        |
        | 5. Final delta extract during freeze window
        v
Production RMM CDS
```

---

### 1. 数据抽取

从 CA 1 抽取：

- volume records
- dataset records
- multivolume chains
- scratch records
- vault records
- retention fields
- expiration fields
- pool fields
- special flags
- EDM flags

要求：

- 抽取时间点必须记录。
- TMC backup 与 extract 必须成对保存。
- 每轮 extract 必须产生 hash / count / control totals。
- 需要记录抽取程序版本。

---

### 2. 数据清洗

大型老系统通常会有历史脏数据：

- TMC 中存在但物理库不存在。
- 物理库存在但 TMC 中不存在。
- catalog 中存在但 TMC 缺失。
- TMC active 但 dataset 已 uncataloged。
- expiration date 异常。
- multivolume chain 断裂。
- duplicate DSN。
- duplicate VOLSER。
- volume 状态与 location 不一致。
- old media type 不受当前 drive 支持。
- orphan tape。
- foreign tape。
- volume 被永久保留但无人知道用途。

需要建立异常分类：

|异常类型|处理方式|
|---|---|
|可自动修复|conversion rule 修复|
|需业务确认|owner sign-off|
|保守迁移|标记为非 scratch / hold|
|可删除|正式批准后不迁移或迁移为 deleted|
|高风险|cutover 前必须解决|

迁移原则：

> 不确定是否可 scratch 的 tape，一律作为 active / hold / non-scratch 迁移，避免误释放。

---

### 3. 字段映射

需要建立转换规格书，包括：

- CA 1 field
- RMM target field
- transformation rule
- default value
- exception handling
- owner
- validation method

示例：

|CA 1 字段|RMM 字段|规则|
|---|---|---|
|VOLSER|Volume serial|原样迁移|
|EXPDT|Expiration|按特殊日期解释表转换|
|DSN|Data set name|原样迁移，非法字符需报告|
|VOL status|Volume status|active/scratch/private 映射|
|Vault code|Location|映射到 RMM location table|
|Pool|Pool / media / SG|根据 range 和 SMS rule|
|EDM flag|EDM status|与产品确认|

---

### 4. 构建 RMM CDS

在测试 LPAR 或隔离环境中：

- 初始化 RMM CDS。
- 加载转换后的 volume / dataset / policy。
- 执行 RMM LIST / SEARCH / REPORT。
- 校验 CDS consistency。
- 执行 backup / recovery 演练。
- 执行 performance check。

---

## 阶段 5：验证策略

大型 tape migration 的成败主要取决于验证质量。

### 1. 控制总数验证

每轮转换必须比较：

|项目|CA 1|RMM|差异|
|---|--:|--:|--:|
|Total volumes|x|x||
|Active volumes|x|x||
|Scratch volumes|x|x||
|Vaulted volumes|x|x||
|Logical volumes|x|x||
|Physical volumes|x|x||
|Dataset records|x|x||
|Multivolume datasets|x|x||
|Permanent tapes|x|x||
|EDM tapes|x|x||
|Offsite tapes|x|x||
|Expired but not scratched|x|x||

差异必须有解释。

---

### 2. 抽样深度验证

按类型抽样：

- 最近 7 天创建的 tape
- 最近 30 天创建的 tape
- 长期归档 tape
- 永久保留 tape
- HSM ML2 tape
- DB2 archive log tape
- IMS log tape
- 多卷数据集
- 多文件序列 tape
- offsite tape
- disaster recovery tape
- scratch candidate
- uncataloged dataset tape
- 应用私有格式 tape

每类抽样建议不少于：

- 小类：30 个
- 关键类：100 个
- 高风险类：全量验证

---

### 3. 业务恢复验证

必须做真实 restore / recall / read test：

|测试场景|验证内容|
|---|---|
|普通 batch input tape|能否 mount 和 read|
|GDG backup tape|能否定位最新 generation|
|DFSMShsm recall|ML2 tape 可访问|
|HSM recycle|不误 scratch|
|DB2 restore|image copy / archive log 正常|
|IMS recovery|log / image copy 正常|
|DFSMSdss restore|dump tape 正常|
|DR test|offsite tape inventory 可用|
|Multivolume dataset|卷序正确|
|Scratch allocation|新 tape 正确分配|
|Tape expiration|到期逻辑符合预期|

---

### 4. 报表对账

需要用 RMM 重新生成等价报表：

- daily scratch report
- active tape inventory
- vault pull list
- return list
- expired volume list
- nonscratch exception
- offsite inventory
- DR inventory
- application owner report
- compliance retention report
- media aging report

与 CA 1 历史报表对比。

---

## 阶段 6：并行运行设计

### 建议并行模式

严格来说，不能让 CA 1 和 RMM 同时作为同一生产系统的活动 tape manager 去控制同一磁带生命周期。  
但可以做以下形式的“并行验证”：

1. CA 1 继续生产控制。
2. 定期从 CA 1 抽取数据。
3. 加载到测试 RMM CDS。
4. 用 RMM 报表模拟生产结果。
5. 比较 CA 1 与 RMM：
    - scratch candidate
    - vault movement
    - expiration
    - volume location
    - dataset ownership
    - pool 分布

并行周期建议：

- 至少 2 到 4 周。
- 覆盖：
    - 月末
    - 周末
    - 全量备份
    - HSM recycle
    - vault cycle
    - 关键业务周期
    - DR 报表生成

---

## 阶段 7：正式切换计划

### 1. 切换前准备

在 cutover 前至少完成：

- 3 次以上成功模拟转换。
- 所有 high severity data exception 关闭。
- RMM CDS backup / recovery 演练成功。
- 业务 restore 测试成功。
- 操作手册完成。
- 自动化规则完成。
- RACF 权限完成。
- JCL 扫描和修改完成。
- DR 文档更新。
- IBM / Broadcom 支持联络方式确认。
- 回退方案演练。
- 冻结通知发出。

---

### 2. 典型 cutover 时间线

假设周末切换：

#### T-14 天

- 冻结迁移范围。
- 不再新增 tape pool / vault 规则。
- 所有 JCL 变更进入 freeze。
- 完成最终演练。

#### T-7 天

- 生成最终 pre-cutover CA 1 inventory。
- 执行 RMM load rehearsal。
- 完成操作培训。
- 确认回退窗口。

#### T-1 天

- 暂停非必要 tape maintenance。
- 备份 CA 1 TMC / Audit。
- 备份相关 parmlib / proclib / JCL / exits。
- 生成 CA 1 最终对账报表。

#### Cutover 开始

1. 停止 tape 创建和 scratch 作业。
2. 停止 HSM recycle / backup / migration 中会创建 tape 的任务。
3. 停止或冻结 vault movement。
4. 确认无关键 tape job 正在运行。
5. 备份 CA 1 TMC / Audit。
6. 最终 extract。
7. 执行 final conversion。
8. 初始化或替换 production RMM CDS。
9. 启动 RMM started task。
10. 更新 parmlib / subsystem / tape management 设置。
11. 停用 CA 1 production hook / started task / exits。
12. 启用 RMM。
13. IPL 是否需要取决于实际实现和变更点，需提前验证。
14. 执行 smoke test。

---

### 3. Cutover smoke test

至少测试：

- RMM started task 正常。
- RMM command 正常。
- 查询已迁移 volume。
- 查询已迁移 dataset。
- scratch volume 可选取。
- 新建 tape 正常登记到 RMM。
- 读取老 tape 正常。
- 多卷 tape 正常。
- cataloged tape 正常。
- uncataloged 但指定 volser 的 tape 正常。
- HSM recall 正常。
- 备份产品写 tape 正常。
- vault 报表正常。
- RMM backup 正常。

---

## 阶段 8：切换后稳定期

### 稳定期建议

至少 4 到 8 周。

### 每日检查

- RMM started task health
- RMM CDS / journal utilization
- new tape creation
- scratch allocation
- mount failure
- IEC / CBR / EDG messages
- HSM errors
- backup software errors
- application abends
- tape open / close errors
- catalog mismatch
- vault movement
- RMM backup success

### 每日对账

前 2 周建议每日生成：

- 新增 tape list
- scratched tape list
- expired candidate list
- active tape count
- scratch count
- vault movement list
- HSM tape activity
- failed mount list
- RMM message exception list

---

# 四、关键任务清单

## A. 技术准备任务

- [ ]  安装并维护 z/OS 3.1 DFSMSrmm 相关 PTF。
- [ ]  建立 RMM started task。
- [ ]  建立 RMM CDS / journal。
- [ ]  配置 EDGRMMxx。
- [ ]  配置 RMM backup。
- [ ]  配置 RMM recovery procedure。
- [ ]  配置 RACF 权限。
- [ ]  配置 automation message rule。
- [ ]  配置 SMS tape ACS。
- [ ]  配置 OAM / library。
- [ ]  配置 TS7700 / ATL 相关策略。
- [ ]  配置 RMM reporting jobs。
- [ ]  配置 WUI / ISPF 管理入口，如需要。

---

## B. 数据转换任务

- [ ]  导出 CA 1 TMC。
- [ ]  导出 CA 1 Audit。
- [ ]  导出 CA 1 rules。
- [ ]  导出 vault / offsite 数据。
- [ ]  导出 scratch / active 报表。
- [ ]  建立字段映射。
- [ ]  建立特殊 EXPDT 映射。
- [ ]  建立 location 映射。
- [ ]  建立 pool 映射。
- [ ]  建立 EDM 映射。
- [ ]  建立异常处理流程。
- [ ]  执行第 1 轮转换。
- [ ]  执行第 2 轮转换。
- [ ]  执行第 3 轮转换。
- [ ]  执行 final cutover 转换。

---

## C. 应用改造任务

- [ ]  扫描所有 JCL。
- [ ]  替换 CA 1 utility。
- [ ]  修改读取 TMC 的自研程序。
- [ ]  替换 CA 1 report。
- [ ]  修改 automation 脚本。
- [ ]  修改 operator procedure。
- [ ]  修改 DR 文档。
- [ ]  修改 audit report。
- [ ]  修改 scheduler dependency。
- [ ]  修改 batch restart procedure。

---

## D. 测试任务

- [ ]  RMM 基础命令测试。
- [ ]  RMM CDS backup / restore 测试。
- [ ]  Tape write 测试。
- [ ]  Tape read 测试。
- [ ]  Scratch allocation 测试。
- [ ]  Expiration 测试。
- [ ]  Vault movement 测试。
- [ ]  HSM recall 测试。
- [ ]  HSM recycle 测试。
- [ ]  DB2 restore 测试。
- [ ]  IMS restore 测试。
- [ ]  DR inventory 测试。
- [ ]  Multivolume 测试。
- [ ]  多 LPAR 共享测试。
- [ ]  性能测试。

---

# 五、主要风险与应对

## 1. Retention 语义不一致

### 风险

CA 1 的保留期规则、特殊 EXPDT、cycle retention、catalog control 与 RMM 不完全一致。错误转换可能导致：

- 提前 scratch
- 永久不释放
- legal hold 失效
- 备份链断裂

### 应对

- 建立特殊日期解释表。
- 对 permanent / critical tape 默认 hold。
- 对 scratch candidate 单独验证。
- 切换后初期禁止自动大批量 scratch。
- 前几周 scratch 操作采用审批制。

---

## 2. TMC 历史脏数据

### 风险

老系统多年积累的数据可能有大量不一致。

### 应对

- 建立异常数据清单。
- 按严重程度分类。
- 不确定的一律不 scratch。
- 对业务 owner 做 sign-off。
- 保留原始 CA 1 报表和 extract 作为审计依据。

---

## 3. Vault / offsite 信息不准确

### 风险

迁移后 RMM location 与实际外送库存不一致，影响 DR。

### 应对

- 与 vault vendor 对账。
- 对 DR tape 全量验证。
- 切换前生成 frozen offsite inventory。
- 切换后第一轮 vault movement 人工复核。

---

## 4. HSM / backup 产品集成问题

### 风险

HSM、FDR、DB2、IMS 等可能依赖 CA 1 行为。

### 应对

- 提前识别所有 EDM / backup-managed tape。
- 让产品 owner 参与测试。
- 做实际 recall / restore。
- 不只做报表验证。

---

## 5. Scratch pool 枯竭

### 风险

迁移后 RMM 判断可 scratch 的 volume 少于 CA 1，导致生产写 tape 失败。

### 应对

- 切换前确认 scratch count。
- 准备额外 scratch range。
- 初期监控 scratch pool。
- 建立 emergency addvol / release procedure。

---

## 6. Tape allocation 走错 pool

### 风险

SMS ACS 或 RMM pool 映射错误，导致新数据写入错误库、错误介质或错误复制策略。

### 应对

- ACS simulator 测试。
- 对关键 DSN pattern 做测试。
- 切换后前几天审计所有新建 tape。
- 对 TS7700 policy 做单独验证。

---

## 7. 多卷 / 多文件序列关系丢失

### 风险

Multivolume dataset 或 stacked file sequence 信息转换错误，导致 restore 失败。

### 应对

- 全量检查 multivolume chain。
- 对大型备份、DB2、IMS、HSM tape 做恢复测试。
- 对 file sequence 不为 1 的 tape 单独抽样。

---

## 8. 运营流程不适配

### 风险

操作员熟悉 CA 1 命令和报表，但不熟悉 RMM。

### 应对

- 制作 CA 1 → RMM 命令对照表。
- 组织 operator training。
- 切换初期安排 storage SME on-call。
- 更新 runbook。

---

## 9. 回退困难

### 风险

切换后如果 RMM 已创建新 tape，再回退 CA 1，会出现两边 catalog 不一致。

### 应对

- 明确 fallback point。
- 在 smoke test 完成前不允许大规模生产。
- 如果已产生新 tape，回退需把新增 tape 手工补录回 CA 1。
- 保留所有 cutover 后 tape activity log。

---

# 六、必须特别注意的事项

## 1. 不要低估“逻辑磁带数量大”的影响

大量 logical tapes 会影响：

- conversion runtime
- RMM CDS size
- LIST / SEARCH 性能
- backup / recovery 时间
- report runtime
- validation runtime
- scratch processing 时间

必须提前做容量估算和性能压测。

---

## 2. 迁移前先清理，但不要过度清理

建议清理：

- 明确 obsolete 的 scratch records
- 过期且已批准释放的 volume
- 不再支持的 media
- 重复/坏记录
- abandoned temporary tapes

但不要为了“看起来干净”而删除不确定的历史归档。

---

## 3. EXPDT 特殊值必须逐一确认

例如类似：

- 99000
- 99365
- 98000
- 99999
- 98001
- 97000
- 其他本地约定日期

不同产品和站点可能有不同解释。必须根据你们当前 CA 1 配置和实际 JCL 解释，而不是凭经验。

---

## 4. EDM tape 不要让 RMM 自行决定过期

如果某些 tape 由外部产品管理生命周期，比如 HSM、FDR、备份软件等，必须确认：

- 谁是 retention authority
- RMM 只是 inventory 管理，还是也控制 scratch
- 外部产品是否会调用 RMM API
- 迁移后是否需要重新定义 EDM rules

---

## 5. DR tape 必须单独处理

DR 相关 tape 的要求高于普通生产 tape：

- 不能误 scratch
- location 必须准确
- restore procedure 必须更新
- disaster site 是否能识别 RMM CDS backup
- DR 演练是否包含 RMM recovery

建议把 DR tape 列为 migration protected class。

---

## 6. 初期不要启用过于激进的自动 scratch

切换后建议：

- 第 1 周：scratch candidate 只报表，不自动释放，或人工审批。
- 第 2-4 周：低风险 pool 自动 scratch，高风险 pool 人工确认。
- 稳定后：恢复自动策略。

---

## 7. 报表等价不代表行为等价

CA 1 和 RMM 报表数字一致，不代表：

- allocation 行为一致
- expiration 行为一致
- vault movement 一致
- restore 行为一致
- HSM 行为一致

必须做真实作业验证。

---

# 七、建议迁移时间表

对于大型商业环境，建议周期如下：

|阶段|时间|
|---|--:|
|项目启动与盘点|2-4 周|
|规则映射与目标设计|3-6 周|
|RMM 环境搭建|2-4 周|
|第 1 轮转换|2-3 周|
|数据清理与修正规则|4-8 周|
|第 2 轮转换与验证|2-4 周|
|并行验证|4-8 周|
|最终演练|1-2 周|
|正式切换|1 个周末或业务低峰窗口|
|稳定观察|4-8 周|
|CA 1 退役|稳定后 2-3 个月|

总周期通常建议按 **4 到 9 个月** 规划。  
如果 tape 数量极大、历史规则复杂、DR 要求严格，可能需要更长。

---

# 八、Cutover 回退方案

## 回退触发条件

例如：

- RMM 无法启动或无法访问 CDS。
- 大量生产 tape allocation failure。
- HSM recall 大面积失败。
- scratch pool 不可用。
- 关键应用无法读取老 tape。
- vault / location 严重错误。
- RMM CDS corruption。
- 无法在规定时间内解决 P1 问题。

## 回退步骤概要

1. 停止所有 tape job。
2. 停止 RMM started task。
3. 恢复 CA 1 parmlib / proclib / exits / subsystem 设置。
4. 恢复 CA 1 TMC / Audit 到 cutover 前状态。
5. 如果切换后已产生新 tape：
    - 抽取 RMM 中新增 volume / dataset。
    - 手工或工具补录到 CA 1。
    - 或标记这些 tape 暂不使用。
6. 启动 CA 1。
7. 执行 CA 1 smoke test。
8. 恢复生产。
9. 记录失败原因并重新规划。

重点：

> 回退不是简单“重新启 CA 1”。只要 RMM 切换后产生过新 tape activity，就必须处理新增 tape 元数据一致性。

---

# 九、迁移成功验收标准

建议设置以下验收标准：

## 数据验收

- Volume 总数差异为 0，或全部差异有批准说明。
- Active volume 差异全部解释。
- Scratch volume 差异全部解释。
- Vault / offsite inventory 与外部库存对账通过。
- Critical tape 100% 验证。
- Multivolume chain 100% 校验。
- EDM tape 100% 分类确认。

## 功能验收

- 新建 tape 正常。
- 读取老 tape 正常。
- Scratch allocation 正常。
- Expiration report 正常。
- Vault movement 正常。
- HSM 正常。
- Backup / restore 正常。
- DR inventory 正常。
- RMM backup / recovery 正常。

## 运营验收

- 操作员完成培训。
- Runbook 完成。
- 报表替换完成。
- 监控和告警完成。
- RACF 权限完成。
- 审计报表完成。
- 支持流程完成。

---

# 十、建议的项目交付物清单

1. Migration project plan
2. Current CA 1 inventory assessment
3. Tape environment topology
4. CA 1 rules documentation
5. RMM target architecture
6. Field mapping specification
7. Retention mapping specification
8. Vault / location mapping specification
9. Pool / VOLSER range mapping
10. EDM handling specification
11. Data cleansing report
12. Conversion runbook
13. Validation plan
14. Test evidence
15. Cutover plan
16. Fallback plan
17. Operations runbook
18. CA 1 to RMM command reference
19. RMM reporting package
20. DR update document
21. Post-cutover support plan
22. Final migration sign-off

---

# 十一、简化版实施路线图

```text
1. 建项目组
2. 盘点 CA 1 TMC、rules、vault、JCL、接口
3. 设计 RMM CDS、policy、pool、location、security
4. 建立 CA 1 到 RMM 字段和规则映射
5. 搭建测试 RMM 环境
6. 执行第一轮转换
7. 修复脏数据和规则差异
8. 执行第二轮转换
9. 对账 volume、dataset、scratch、vault、retention
10. 做真实 restore / recall / write / scratch 测试
11. 并行报表验证 4-8 周
12. 完成最终演练
13. 生产冻结
14. 最终 CA 1 extract
15. 构建 production RMM CDS
16. 停 CA 1，启 RMM
17. Smoke test
18. 恢复生产
19. 稳定期每日检查
20. 稳定后退役 CA 1
```

---

# 十二、结论

从 **CA 1 15 TMS** 迁移到 **IBM DFSMSrmm / RMM on z/OS 3.1** 是可行的，但对于多年运行的大型逻辑磁带环境，关键不在工具本身，而在：

- **Retention 语义映射**
- **TMC 历史数据质量**
- **Vault / DR 准确性**
- **HSM / backup 产品集成**
- **SMS / tape allocation 行为**
- **多轮转换与真实恢复测试**
- **明确 cutover 与 fallback**

建议把它作为一个正式基础设施迁移项目来管理，而不是简单产品替换。最安全的策略是：

> **先按现状等价迁移，确保生产稳定；再逐步利用 RMM 的策略管理能力优化 tape 生命周期。**

---

Learn more:

1. [Converting to DFSMSrmm from CA-1](https://www.redbooks.ibm.com/abstracts/sg246241.html?utm_source=openai)
2. [Implementing DFSMSrmm](https://www.ibm.com/docs/en/zos/3.1.0?topic=guide-implementing-dfsmsrmm&utm_source=openai)