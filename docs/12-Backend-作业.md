# 第12讲作业：痕迹抹除——删除用户和删除文件（Backend）

## 需求

> 我们虽然可以新建用户和上传文件，但却不可以删除用户或删除文件。实现这个功能需要两个路由：
>
> - `/user/delete`：删除用户及其所有记录（GET，无参数，但有 Authorization 请求头）
> - `/file/delete`：删除某个文件（POST，参数 `{room: uuid, filename: string}`）

## 实现内容

### `/user/delete`（`backend/src/user.ts`）

- 复用 `authenticate` 中间件验证 JWT；为把用户身份传给处理器，`authenticate.ts` 现在会把 token 解码出的 `uuid` 写入 `res.locals.uuid`（对所有使用该中间件的路由向后兼容）；
- 直接以 token 中的 `uuid` 调用新增的 `deleteUser` SDK 方法执行 `delete_user_by_pk`；
- 用户、`user_room`、`message`、`note` 表之间的外键均带 `on delete cascade`（见 `database/sql/*.sql`），删除用户记录即可级联清空其所有记录；
- 返回值设计：token 无效/缺失 401；token 中的用户不存在（如已被删除）404；成功 200；数据库异常 500。

### `/file/delete`（`backend/src/file.ts`）

文件只保存在服务器磁盘（`upload/<room>/<filename>`），不在数据库中，因此直接删除文件即可：

- 输入检查（对应讲义提示"仔细设计输入检查"）：
  - 缺少 `room` 或 `filename` → 422；
  - `room` 必须是合法 UUID → 否则 422（同时杜绝通过 room 进行的路径穿越）；
  - `filename` 不允许为空、包含 `/`、`\` 或 `..` → 否则 422；
- 文件不存在 404；路径存在但不是普通文件（目录等）422；
- 删除成功 200；磁盘异常 500。

### `backend/src/graphql.ts`

按 graphql-codegen 的生成风格手工补充了 `deleteUser` 操作（`DeleteUserDocument`、`DeleteUserMutation[Variables]`、`getSdk().deleteUser`）。若之后重新运行 codegen，可先在 `database/graphql/` 中加入同样的 mutation。

## 测试记录

使用 `npx tsc --noEmit` 通过类型检查；并用一个本地 mock Hasura（返回标准 `{data: ...}` 包装）+ 真实启动后端（`ts-node src/index.ts`）对路由做了端到端测试，**10 项全部通过**：

| 用例 | 期望 | 结果 |
| --- | --- | --- |
| 无 token 删除用户 | 401 | PASS |
| 带 token 删除用户 | 200 | PASS |
| 重复删除（用户已不存在） | 404 | PASS |
| `/file/delete` 缺参数 | 422 | PASS |
| 文件名含 `../`（路径穿越） | 422 | PASS |
| room 不是 uuid | 422 | PASS |
| 文件不存在 | 404 | PASS |
| 正常删除文件 | 200 | PASS |
| 文件确实从磁盘消失 | 是 | PASS |
| 无 token 删除文件 | 401 | PASS |

## 已知边界

- 用户上传的文件存放在按会议划分的目录中，与用户没有归属关系，因此删除用户不会（也无法）删除其上传过的文件；
- 上游 `index.ts` 中 `dotenv.config()` 在路由模块加载之后才执行，`FILE_DIR` 环境变量实际不生效（文件根目录始终是 `backend/upload`），本作业按现状处理，未修改这一既有行为。
