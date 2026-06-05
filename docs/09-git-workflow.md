# Git 工作流

## 仓库名

实际仓库名：`boss-jobpilot`

远程仓库：`https://github.com/nobodycare-no/boss-jobpilot.git`

## 分支策略

| 分支 | 用途 |
| --- | --- |
| main | 稳定分支，可随时打包 |
| develop | 日常集成分支 |
| feature/* | 新功能 |
| fix/* | Bug 修复 |
| docs/* | 文档 |
| chore/* | 工程维护 |

MVP 初期也可以只使用 `main + feature/*`，减少流程成本。

## Commit 规范

使用 Conventional Commits：

```text
feat: add experience library schema
fix: handle empty job description
docs: add system architecture
chore: configure eslint
test: add scoring tests
refactor: extract ai provider adapter
```

## Pull Request 检查项

- 功能是否有明确验收结果。
- 是否更新相关文档。
- 是否有测试或手动验证说明。
- 是否影响数据模型和迁移。
- 是否引入敏感数据泄露风险。

## 协作约定

默认在完成一个可验证的阶段性改动后提交并推送到远程仓库。临时试验、未验证改动或用户明确要求不推送时，仅保留在本地工作区。

## 建议初始化命令

```powershell
git init
git add .
git commit -m "docs: initialize project planning"
```

远程仓库已创建时：

```powershell
git branch -M main
git push -u origin main
```
