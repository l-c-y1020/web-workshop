# 第13讲作业：便签纸前端界面（Frontend）

## 需求

> 【数据库】便签纸功能，用户可以为每个会议创建一个便签纸，便签纸仅自己可见

对应第 11 讲实现的 `note` 表（`database/sql/note.sql`）与第 12 讲的路由风格，本讲在前端完成便签纸的完整 UI。

## 实现内容

### `frontend/src/NoteWindow.tsx`（新增）

便签纸窗口组件，仿照 `FileShare` 的可拖拽小窗模式（`Card` + 右上角关闭按钮 + `.need-interaction`）：

- **加载**：`useGetMyNoteQuery` 查询当前会议中自己的便签纸（查询本身带 `room_uuid` 过滤，行级可见性由第 11 讲的 Hasura 权限 `X-Hasura-User-Id` 保证，前端无需也不能看到别人的便签）；
- **编辑与自动保存**：`Input.TextArea`（`autoSize` 固定 8 行、`maxLength=1000`、`showCount`），输入停止 **1 秒后**自动调用 `saveMyNoteMutation` 保存（`insert_note_one` + `on_conflict`，没有就创建、有就覆盖）；
- **状态提示**：底部实时显示"保存中…… / 已自动保存 ××时间 / 输入后自动保存"；
- **清空**：右下角"清空"按钮，将内容置空并立即保存；
- **防覆盖**：用 `dirtyRef` 记录用户是否已开始输入，避免 Apollo 查询返回旧数据时覆盖正在编辑的内容；卸载时清理未触发的自动保存定时器。

### `frontend/src/graphql.tsx`

按 graphql-codegen 客户端预置的生成风格补充了两个操作及其 Apollo hooks：

- `getMyNote` 查询 → `useGetMyNoteQuery`
- `saveMyNote` mutation → `useSaveMyNoteMutation`

（变量命名与既有代码一致采用 `room_uuid`；重新运行 codegen 时可先在 `database/graphql/note.graphql` 基础上补全。）

### `frontend/src/index.tsx` / `frontend/src/MainPanel.tsx`

- `index.tsx` 仿照聊天室/文件共享窗口，新增 `noteList` 状态与 `addNote`/`removeNote`，把 `NoteWindow` 渲染进 `MyDraggable` 拖拽窗口；
- `MainPanel.tsx` 的每个会议条目上新增"**打开便签纸**"入口（与"打开聊天室"、"打开文件共享空间"并列）。

## 验证记录

- `yarn install --frozen-lockfile` 安装依赖无 error；
- `yarn build`（craco + TS 类型检查 + webpack 构建）**完整通过**，产物已生成；
- 运行时数据链路（查询/自动保存）依赖真实的 Hasura 实例与登录态，需要在控制台完成第 11 讲的建表与权限配置后，按 `yarn start` 联调验证。

## 已知边界

- 未登录状态下会议列表为空，便签纸入口随会议列表出现，无需额外鉴权判断；
- "仅自己可见"完全由数据库权限层保证（即使绕过前端直接调 GraphQL 也看不到别人的便签纸），前端只做了对应的展示文案说明。
