# 第11讲作业：便签纸表结构及 GraphQL 操作（Database）

## 需求

> 便签纸功能，用户可以为每个会议创建一个便签纸，便签纸仅自己可见

## 表结构设计

新建 `note` 表（见 `database/sql/note.sql`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `uuid` | uuid, PK | 便签纸 id，默认 `gen_random_uuid()` |
| `content` | text | 便签内容，默认空字符串 |
| `user_uuid` | uuid, FK → `user.uuid` | 创建者，`on delete cascade` |
| `room_uuid` | uuid, FK → `room.uuid` | 所属会议，`on delete cascade` |
| `created_at` | timestamp | 创建时间，默认当前时间 |
| `updated_at` | timestamp | 修改时间，默认当前时间 |

关键约束与设计考虑：

1. **"每个会议只能有一个便签纸"**：`unique (user_uuid, room_uuid)` 联合唯一约束，同一用户对同一会议最多一张便签纸（不同用户、不同会议之间互不影响）；
2. **级联删除**：用户或会议被删除时，对应便签纸自动删除，不留脏数据；
3. **创建时间和修改时间**：`created_at` 用默认值记录；`updated_at` 由触发器 `set_note_updated_at` 在每次 UPDATE 前自动刷新，无需调用方关心；
4. **仅自己可见**：这一条属于权限设计，在 Hasura 中实现（见下文），表结构本身不限制可见性。

## 在 Hasura 控制台中的操作步骤

1. **建表**：Data → SQL，粘贴执行 `database/sql/note.sql` 的建表部分（需在 `user`、`room` 表已存在之后执行）；
2. **Track 表**：确认 `public.note` 已被 track（执行 SQL 时勾选 "Track this table" 即可）；
3. **权限**：不手动配置也可以直接导入本仓库的 metadata——Settings → Metadata Actions → Import metadata，选择 `database/hasura/metadata/` 对应的打包文件；手动配置的话，按 `database/hasura/metadata/databases/workshop/tables/public_note.yaml` 中的内容，为 `user` 角色添加 insert/select/update/delete 四个权限，**所有权限的行级过滤均为 `{"user_uuid": {"_eq": "X-Hasura-User-Id"}}`**：
   - insert：`check` 同上，允许列 `content, room_uuid, user_uuid`；
   - select：允许列 `content, room_uuid, user_uuid, created_at, updated_at, uuid`；
   - update：仅允许列 `content`（用户不能改归属）；
   - delete：行级过滤同上；
4. **外键关系**：Schema 页面 Track all foreign-key relationships，生成 `note.user`、`note.room` 两个对象关系。

## GraphQL 操作

见 `database/graphql/note.graphql`，共三个操作：

- `getMyNote`：查询我在某会议中的便签纸（权限过滤保证只返回自己的）；
- `saveMyNote`：用 `insert_note_one` + `on_conflict` 实现"没有就创建、有就覆盖"，对应联合唯一约束 `note_user_uuid_room_uuid_key`；
- `deleteMyNote`：按主键删除自己的便签纸。

## 测试记录

在 Hasura 控制台 GraphiQL 中（以 `user` 角色并传入 `X-Hasura-User-Id` 测试）：

1. 以 `00000000-0000-0000-0000-000000000000`（admin）身份执行 `saveMyNote(roomUuid: "00000000-0000-0000-0000-100000000001")`，返回新建记录，`updated_at` 等于 `created_at`；
2. 再次执行并修改 content，返回同一条记录，`updated_at` 晚于 `created_at`（触发器生效）；
3. 换另一个 `X-Hasura-User-Id` 执行 `getMyNote`，返回空数组——**别人的便签纸不可见**；
4. 用别人的身份执行 `deleteMyNote`，返回 `affected_rows: 0`——**删不掉别人的便签纸**。
