-- PostgreSQL
-- 便签纸：用户可以为每个会议创建一张便签纸，便签纸仅创建者自己可见
create table if not exists public.note (
  uuid uuid default gen_random_uuid() not null,
  content text not null default '',
  user_uuid uuid not null,
  room_uuid uuid not null,
  created_at timestamp default current_timestamp not null,
  updated_at timestamp default current_timestamp not null,
  primary key (uuid),
  -- 每个用户在同一个会议里只能有一张便签纸
  unique (user_uuid, room_uuid),
  foreign key (user_uuid) references public.user (uuid) on delete cascade,
  foreign key (room_uuid) references public.room (uuid) on delete cascade
);

insert into public.note (user_uuid, room_uuid, content) values
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-100000000001', '记得先做自我介绍！');

-- 修改便签内容时自动更新 updated_at
create or replace function set_note_updated_at() returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

create trigger note_set_updated_at
before update on public.note
for each row execute function set_note_updated_at();
