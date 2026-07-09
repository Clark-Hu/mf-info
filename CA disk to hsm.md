把 **CA Disk 迁移/转换到 IBM DFSMShsm** 时，最容易低估的不是 HSM 参数本身，而是**大量应用 JCL、PROC、CLIST/REXX、调度作业、运维脚本里直接调用 CA Disk 命令或程序**。建议把项目拆成“产品功能对齐 + 应用依赖治理 + 分阶段切换”三条线并行推进。

下面给一个比较实用的规划框架。

---

## 1. 先明确迁移范围：CA Disk 用了哪些功能

先不要急着替换命令。应先盘点 CA Disk 在你们环境中的使用场景：

|CA Disk 使用场景|DFSMShsm 对应能力|风险点|
|---|---|---|
|自动迁移 ML1/ML2|HSM MIGRATE / RECALL|策略、class、空间阈值不同|
|归档 Archive|HSM BACKDS / ABACKUP / aggregate backup，或其他备份产品|CA Disk archive 与 HSM backup/archive 概念不完全等价|
|Restore dataset|HRECOVER / RECOVER|保留期、catalog、generation 行为差异|
|日常空间管理|HSM 自动空间管理|触发条件不同|
|显式释放/召回|HRECALL / HMIGRATE|JCL 中直接调用需替换|
|报表/查询|LIST 命令、ISMF、HSM 日志/SMF|报表格式差异|
|Application job 直接执行 CA Disk|需要替换为 HSM 命令、封装接口或中间层|最大风险|

特别要区分三类数据：

1. **普通用户数据集**
2. **应用数据集**
3. **系统/关键生产数据集**

它们的迁移策略、窗口和回退方式不应相同。

---

## 2. 重点盘点应用作业中对 CA Disk 的直接依赖

这是你特别提到的重点。常见直接依赖包括：

### 2.1 JCL 中直接调用 CA Disk 程序

例如：

```jcl
//STEP1 EXEC PGM=ADRDSSU
```

或 CA Disk 相关程序、PROC、utility。

也可能是：

```jcl
//STEP1 EXEC PROC=CADISKxx
```

### 2.2 SYSIN 中包含 CA Disk 命令

例如：

```jcl
//SYSIN DD *
  ARCHIVE DSN=...
  RESTORE DSN=...
  RELEASE DSN=...
/*
```

### 2.3 TSO batch 调用

例如：

```jcl
//SYSTSIN DD *
  CADISK ...
/*
```

或通过 IKJEFT01、REXX、CLIST 调用 CA Disk 命令。

### 2.4 Scheduler 变量或 PROC 间接调用

很多应用组可能没有意识到自己在用 CA Disk，因为调用藏在：

- enterprise PROC library
- scheduler skeleton
- Control-M / CA-7 / TWS 参数
- INCLUDE member
- symbolic parameters
- REXX wrapper
- 运维自动化脚本
- Abend recovery job
- 月结/年结归档作业

### 2.5 在线或人工操作依赖

例如：

- application support 手工 restore 某个历史文件
- DBA 或 batch support 使用 CA Disk panel
- 生产支持手册中写着 “run CA Disk restore”
- helpdesk SOP 中引用 CA Disk 命令

这些也必须纳入变更范围。

---

## 3. 建立 CA Disk 使用清单

建议做一个 inventory，至少包含以下字段：

|字段|说明|
|---|---|
|Job name|哪个作业|
|Application|归属系统|
|Owner|应用负责人|
|Environment|PROD/UAT/DEV|
|CA Disk function|archive / restore / release / report / recall|
|调用方式|JCL / PROC / REXX / CLIST / manual|
|Dataset pattern|涉及哪些 HLQ 或 mask|
|运行频率|每日/月结/按需|
|是否关键路径|是否影响 SLA|
|替代方案|HSM 命令、wrapper、删除、改流程|
|测试状态|未评估/已改/已测/已上线|
|回退方案|怎么退回 CA Disk 或恢复数据|

---

## 4. 自动扫描 JCL、PROC、CLIST、REXX

建议从以下库中扫描关键字：

- production JCL libraries
- procedure libraries
- scheduler libraries
- REXX/CLIST libraries
- operations libraries
- application control libraries
- SYSIN parameter libraries
- documentation repository，如果有的话

扫描关键词可以包括：

```text
CADISK
CA-DISK
DISK
ARCHIVE
RESTORE
RELEASE
RECOVER
MIGRATE
RECALL
ADRDSSU
IKJEFT01
HRECALL
HMIGRATE
HRECOVER
BACKDS
LISTCAT
```

注意：`ARCHIVE`、`RESTORE` 等词太泛，要结合上下文判断。

更稳妥的做法是分层扫描：

### 第一层：精确扫描产品名称和程序名

```text
CADISK
DMS
CA Disk 程序名
CA Disk PROC 名
```

### 第二层：扫描命令语义

```text
ARCHIVE DSN
RESTORE DSN
RELEASE DSN
PURGE
BACKUP
```

### 第三层：扫描 TSO batch 和 REXX 调用

```text
IKJEFT01
IKJEFT1A
SYSTSIN
ADDRESS TSO
CALL
```

### 第四层：扫描调度系统

有些 job 的 SYSIN 是调度器运行时生成的，不在 JCL library 里。

---

## 5. 不建议简单一刀切替换

CA Disk 和 DFSMShsm 的命令、策略和元数据模型不同。不要假设：

```text
CA Disk ARCHIVE = HSM HMIGRATE
CA Disk RESTORE = HSM HRECOVER
CA Disk RELEASE = HSM MIGRATE
```

很多场景需要重新设计。

例如：

### 场景 A：应用 job 主动 archive 文件

原逻辑可能是：

1. 生成月结文件
2. 用 CA Disk archive 到二级介质
3. 删除在线 copy
4. 以后按需 restore

迁到 HSM 后要问：

- 这是迁移 migration，还是备份 backup？
- 是否需要保留多个历史版本？
- 是否需要按日期恢复？
- 是否需要保留已删除数据集？
- catalog 是否保留？
- 应用是否期望 restore 后数据集属性完全一致？
- 保留期由谁控制？

如果只是空间管理，可用 HSM migrate。  
如果是合规或历史保留，可能更接近 backup/archive 策略，而不只是 migrate。

---

## 6. 建议建立兼容层或 wrapper

对于大量应用作业直接调用 CA Disk 的环境，强烈建议不要让每个应用组自己直接改成 HSM 命令。更好的方式是建立一个企业级 wrapper。

例如提供统一 PROC：

```jcl
//HSMUTIL EXEC PROC=HSMUTIL,
// ACTION=ARCHIVE,
// DSN='APP.PROD.FILE1'
```

或统一 REXX/CLIST：

```text
HSMUTIL ACTION(RESTORE) DSN(APP.PROD.FILE1)
```

内部根据 ACTION 转换为：

- HMIGRATE
- HRECALL
- HRECOVER
- BACKDS
- DELETE + RECOVER
- LIST
- 或调用其他备份产品

这样做的好处：

1. 应用改动最小
2. 后续策略可集中调整
3. 可加入审计、日志、权限检查
4. 可统一错误码
5. 可在过渡期支持 CA Disk 和 HSM 双路由
6. 回退更容易

---

## 7. Wrapper 设计时要特别考虑 return code

很多应用 job 对 CA Disk 的 RC 有依赖，例如：

```jcl
//STEP2 EXEC ...,COND=(4,LT)
```

或 scheduler 根据 RC 触发后续流程。

迁到 HSM 后，需要定义：

|旧 CA Disk 结果|新 HSM 结果|Wrapper RC|
|---|---|---|
|成功|成功|0|
|数据集不存在但可接受|not found|0 或 4|
|已经 migrated|no action|0|
|recall 失败|failure|8/12|
|权限不足|RACF denied|12|
|HSM 不可用|subsystem error|16|

必须避免 HSM 原始 return code 直接暴露给应用，导致调度逻辑异常。

---

## 8. 制定功能映射标准

建议形成一个正式 mapping document，例如：

|CA Disk 操作|业务语义|HSM 替代|是否允许应用直接使用|
|---|---|---|---|
|ARCHIVE|长期保留|HSM backup 或其他 archive|不建议|
|RESTORE|恢复历史文件|HRECOVER / wrapper|通过 wrapper|
|RELEASE|释放 DASD 空间|HMIGRATE|可通过 wrapper|
|RECALL|召回数据集|HRECALL|可通过 wrapper|
|REPORT|查询归档状态|HSM LIST / report|运维使用|
|DELETE after archive|保留后删除|需重新评估|严控|

---

## 9. 重新设计 SMS/HSM policy

DFSMShsm 通常和 SMS policy 紧密相关。需要检查：

- Management Class
- Storage Class
- Data Class
- Storage Group
- 自动 migration 条件
- ML1/ML2 使用方式
- Backup frequency
- Retention limit
- Command backup
- Aggregate backup
- Recall behavior
- Tape pool
- HSM control data sets
- Journal
- CDS backup
- Exit/rule

关键问题：

1. 哪些数据集可以自动 migrate？
2. 哪些数据集必须禁止 migrate？
3. 哪些数据集需要 backup？
4. 哪些数据集需要长期 retention？
5. 用户是否允许手动 HMIGRATE/HRECALL？
6. recalls 是否会影响批处理窗口？
7. ML1/ML2 容量是否足够？
8. HSM recall 高峰是否会拖慢 batch？

---

## 10. 数据迁移策略：不要一次性全部转换

建议按数据类型和应用风险分批。

### Phase 0：Discovery

- 扫描所有 CA Disk 依赖
- 建立应用清单
- 建立数据集清单
- 明确 CA Disk 当前策略
- 明确合规保留要求
- 识别高风险应用

### Phase 1：Build HSM baseline

- 配置 DFSMShsm
- 建立 SMS policy
- 建立 HSM CDS、journal、backup
- 配置 ML1/ML2
- 测试 migrate/recall/recover
- 建立监控与报表

### Phase 2：Compatibility layer

- 建立 wrapper PROC/REXX
- 设计 RC 映射
- 设计日志
- 设计审计
- 支持 dry-run 模式
- 支持双路由：某些 HLQ 仍走 CA Disk，某些走 HSM

### Phase 3：Pilot

选择低风险应用：

- 非关键路径
- 数据量适中
- 应用团队配合度高
- 有明确测试案例

完成：

- JCL 修改
- 功能测试
- restore/recover 测试
- 性能测试
- 回退演练

### Phase 4：Wave migration

按应用或 HLQ 分批：

1. DEV
2. TEST
3. UAT
4. PROD 非关键
5. PROD 关键

每一波都要有：

- cutover checklist
- freeze window
- fallback plan
- signoff
- post-implementation validation

### Phase 5：Decommission CA Disk

只有在满足以下条件后才下线：

- 没有生产 job 调用 CA Disk
- 所有历史 archive 数据有访问方案
- 合规团队确认保留要求满足
- 运维 SOP 已更新
- support team 已培训
- 至少经历一个完整业务周期，例如月结/季结/年结

---

## 11. 历史 CA Disk archive 数据怎么处理

这是另一个大坑。

你需要决定：

### 方案一：保留 CA Disk 只读一段时间

优点：

- 风险低
- 不必一次性转换所有历史归档

缺点：

- 仍需维护 license/环境
- 运维复杂

### 方案二：批量 restore 再交给 HSM 管理

流程大致是：

1. 从 CA Disk restore 历史数据
2. 验证数据集属性和内容
3. 重新 catalog
4. 通过 HSM migrate/backup
5. 校验可 recall/recover
6. 删除 CA Disk copy

风险：

- DASD 临时空间需求大
- 时间窗口长
- 数据集命名冲突
- 历史 GDG 处理复杂
- 保留期可能丢失语义

### 方案三：只转换活跃历史数据

例如只转换过去 13 个月或 7 年内有访问需求的数据，其余保留在 CA Disk 到过期。

这个方案通常最现实。

---

## 12. 应用作业改造策略

针对应用 job 中直接用 CA Disk 的情况，可以分成几类处理。

### 类型 1：只是为了释放空间

原 CA Disk：

```text
RELEASE DSN(APP.FILE)
```

可改为：

```text
HMIGRATE 'APP.FILE'
```

或通过 wrapper：

```text
HSMUTIL ACTION(MIGRATE) DSN(APP.FILE)
```

### 类型 2：作业开始前强制恢复数据

原 CA Disk restore：

```text
RESTORE DSN(APP.FILE)
```

如果数据集只是 migrated，可改为：

```text
HRECALL 'APP.FILE'
```

但如果原来 restore 的是已删除历史版本，就需要：

```text
HRECOVER 'APP.FILE'
```

这两者要分清：

- **HRECALL**：召回 migrated dataset
- **HRECOVER**：从 backup 恢复 dataset

### 类型 3：作业结束后归档并删除

这类最危险。要明确业务语义：

- 是为了节省空间？
- 是为了保留历史？
- 是为了 audit？
- 是否以后会按版本恢复？
- 是否删除 catalog entry？

可能需要改成：

1. HSM backup
2. 验证 backup 成功
3. 删除在线数据集
4. 用 wrapper 记录 archive index

或者改为应用层留 GDG，再由 HSM 策略管理。

### 类型 4：报表查询

如果应用只是检查数据是否已归档，建议改成 wrapper 查询，避免应用解析 HSM 原生命令输出。

---

## 13. 测试重点

不要只测试 “命令能跑通”。要测试完整业务场景。

### 必测项目

- migrated dataset recall
- deleted dataset recover
- GDG base 和 generation
- VSAM cluster
- multi-volume dataset
- large sequential dataset
- tape recall
- RACF 权限
- SMS class assignment
- catalog 状态
- dataset attributes
- DISP=OLD/SHR/MOD 行为
- batch 并发 recall
- recall 等待时间
- HSM down 时应用表现
- RC 和 message
- scheduler dependency
- rerun/restart

### 特别关注

#### 13.1 GDG

很多应用月结、日结依赖 GDG。如果 CA Disk 归档的是历史 generation，迁到 HSM 后要确认：

- GDG base 是否存在
- generation limit 如何处理
- uncataloged generation 如何恢复
- 相对代号如 `(+1)`、`(-1)` 是否受影响

#### 13.2 VSAM

VSAM 比普通 sequential dataset 更敏感：

- cluster/data/index component
- alternate index
- path
- catalog restore
- SMS class
- shareoptions
- reuse 属性

#### 13.3 应用 restart

如果 batch 中间失败，旧 CA Disk 流程可能已经 archive/delete 了一部分数据。新 HSM 流程必须验证 restart 行为。

---

## 14. 安全与权限

迁移后需要重新设计 RACF/ACF2/Top Secret 权限：

- 谁可以 HMIGRATE？
- 谁可以 HRECALL？
- 谁可以 HRECOVER？
- 谁可以恢复别人的数据？
- 应用 ID 是否有权限 restore production dataset？
- wrapper 是否使用 surrogate authority？
- 是否需要审计所有 recover 操作？

特别是恢复历史数据，通常应比普通 recall 更严格。

---

## 15. 性能与容量规划

DFSMShsm 上线后可能出现 recall storm，尤其是：

- 每日 batch 开始时大量 migrated datasets 被自动 recall
- 月结时大量历史文件恢复
- 用户早上登录后同时访问 migrated datasets
- 应用 job 串行等待 recall

需要规划：

- ML1 DASD 容量
- ML2 tape/VTS 容量
- migration task 数
- recall task 数
- backup window
- HSM address space 参数
- tape drive/VTS mount 能力
- CDS 性能
- SMF 监控
- alert 阈值

建议在 pilot 期间收集：

- 每日 migrate 数量
- 每日 recall 数量
- 平均 recall 时间
- P95/P99 recall 时间
- 最大并发 recall
- 失败率
- ML1/ML2 增长趋势

---

## 16. 回退方案

每一波 cutover 都要有可执行回退。

### 应用层回退

- JCL 可切回 CA Disk PROC
- wrapper 可通过参数切回 CA Disk backend
- scheduler 变量可回退
- 旧 PROC 暂时保留

### 数据层回退

- 切换前保留 CA Disk copy
- HSM 迁移后不要立刻 purge 旧 archive
- 关键数据集保留双份一段时间
- 每波迁移完成后做 restore/recover 验证

### 运行层回退

- HSM address space 故障处理
- recall backlog 处理
- 批处理窗口超时处理
- emergency restore procedure

---

## 17. 生产切换建议

不要按技术对象切，比如“一次性迁所有 ML2 数据”。更建议按业务应用切：

1. 选定应用/HLQ
2. 清理所有 CA Disk 调用
3. 修改 wrapper 或 JCL
4. 应用测试签字
5. 迁移对应数据
6. 生产切换
7. 观察一个周期
8. 进入下一批

切换前 checklist：

- 应用 owner 已确认
- JCL/PROC 已改
- scheduler 已改
- RACF 已配置
- HSM policy 已生效
- 数据集清单已确认
- 历史 archive 访问方式已确认
- fallback 已演练
- support script 已更新
- 运维值班已培训

---

## 18. 推荐组织方式

建议成立几个工作流：

### Workstream 1：HSM infrastructure

负责：

- DFSMShsm 配置
- SMS policy
- CDS/journal
- tape/VTS
- performance

### Workstream 2：Application remediation

负责：

- 扫描 JCL
- 联系应用 owner
- 改造 PROC/JCL
- 测试和 signoff

### Workstream 3：Data conversion

负责：

- CA Disk archive inventory
- 历史数据处理
- restore/re-migrate
- 保留期映射

### Workstream 4：Operations readiness

负责：

- SOP
- 监控
- 报表
- incident handling
- 培训

### Workstream 5：Governance & compliance

负责：

- 保留期
- 审计
- 安全权限
- 合规确认

---

## 19. 实施中的关键原则

我会建议遵循这几个原则：

1. **先盘点，再替换**
2. **先 wrapper，再批量改应用**
3. **先低风险，再核心生产**
4. **先验证 recover，再删除旧 archive**
5. **不要把 migration 当 archive 用**
6. **不要让应用直接解析 HSM 输出**
7. **保留 CA Disk 只读能力直到完整业务周期结束**
8. **所有恢复场景都必须演练**
9. **所有 RC 和 scheduler 逻辑必须重新确认**
10. **GDG、VSAM、uncataloged dataset 单独处理**

---

## 20. 一个可落地的迁移路线图

### 第 1 阶段：4–8 周 Discovery

- 收集 CA Disk 配置
- 扫描所有直接调用
- 建立应用和数据 inventory
- 识别高风险功能
- 完成功能映射设计

### 第 2 阶段：4–6 周 HSM 设计与搭建

- SMS/HSM policy 设计
- HSM 环境搭建
- wrapper 初版
- 安全权限设计
- 运维报表设计

### 第 3 阶段：6–10 周 Pilot

- 选择 2–3 个应用
- 改 JCL/PROC
- 测试 migrate/recall/recover
- 测试月结或关键流程
- 完成回退演练

### 第 4 阶段：按 wave 推广

每波应用：

- Discovery validation
- 修改
- SIT/UAT
- cutover
- 观察
- signoff

### 第 5 阶段：CA Disk 退役

- 冻结新 CA Disk 使用
- 保留只读访问
- 处理历史 archive
- 完成审计
- 下线 license 和 started task

---

## 简短结论

如果有很多用户应用 job 直接使用 CA Disk，迁移到 DFSMShsm 时，**不要把它当成单纯产品替换**。它更像一个应用改造和数据治理项目。

最重要的计划动作是：

1. **全面扫描 JCL/PROC/REXX/调度系统中的 CA Disk 调用**
2. **建立 CA Disk 功能到 HSM 功能的标准映射**
3. **设计 wrapper/兼容层，避免每个应用直接写 HSM 命令**
4. **逐应用、逐 HLQ 分批切换**
5. **保留 CA Disk 历史 archive 的访问能力一段时间**
6. **重点测试 GDG、VSAM、restore/recover、RC、scheduler 逻辑**
7. **每一波都必须有回退方案**

如果只改基础设施，不处理应用 job 里的直接 CA Disk 依赖，生产风险会非常高。