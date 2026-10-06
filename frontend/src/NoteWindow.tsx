import { useEffect, useRef, useState } from "react";
import { Button, Input, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import * as graphql from "./graphql";
import { Card, Container, Text } from "./Components";

interface NoteWindowProps {
  room: graphql.GetJoinedRoomsQuery["user_room"][0]["room"] | undefined;
  handleClose: () => void;
}

// 便签纸：每个用户在每个会议中只有一张，仅自己可见（由数据库权限保证）
const NoteWindow: React.FC<NoteWindowProps> = ({ room, handleClose }) => {
  const [content, setContent] = useState<string>("");
  const [savedAt, setSavedAt] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  // dirty 标记：避免查询结果覆盖正在编辑的内容
  const dirtyRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = graphql.useGetMyNoteQuery({
    skip: !room,
    variables: { room_uuid: room?.uuid ?? "" },
  });
  const [saveMyNoteMutation] = graphql.useSaveMyNoteMutation();

  useEffect(() => {
    const note = data?.note[0];
    if (note && !dirtyRef.current) {
      setContent(note.content);
      setSavedAt(
        new Date(note.updated_at).toLocaleString("zh-CN", {
          dateStyle: "short",
          timeStyle: "short",
        })
      );
    }
  }, [data]);

  // 卸载时清掉尚未触发的自动保存定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const save = async (value: string) => {
    if (!room) {
      return;
    }
    setSaving(true);
    const result = await saveMyNoteMutation({
      variables: { room_uuid: room.uuid, content: value },
    });
    if (result.errors) {
      console.error(result.errors);
      message.error("保存便签失败！");
    } else {
      setSavedAt(
        new Date(result.data?.insert_note_one?.updated_at ?? Date.now()).toLocaleString(
          "zh-CN",
          { dateStyle: "short", timeStyle: "short" }
        )
      );
    }
    setSaving(false);
  };

  const handleChange = (value: string) => {
    setContent(value);
    dirtyRef.current = true;
    // 自动保存：停止输入 1 秒后保存
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => save(value), 1000);
  };

  const handleDelete = async () => {
    if (!room) {
      return;
    }
    setDeleting(true);
    setContent("");
    dirtyRef.current = true;
    await save("");
    message.success("便签纸已清空！");
    setDeleting(false);
  };

  const Close = () => (
    <Button
      type="link"
      style={{
        width: "40px",
        height: "40px",
        fontSize: "12px",
        position: "absolute",
        right: 0,
        top: 0,
      }}
      className="need-interaction"
      onClick={handleClose}
    >
      ❌
    </Button>
  );

  if (!room) {
    return null;
  }
  return (
    <Card style={{ width: "300px", height: "360px" }}>
      <Close />
      <Container style={{ margin: "6px" }}>
        <Text>
          <strong>{room.name}</strong>
        </Text>
        <Text size="small" style={{ marginTop: "6px", marginBottom: "6px" }}>
          我的便签纸（仅自己可见）
        </Text>
      </Container>
      <div className="need-interaction" style={{ margin: "6px" }}>
        <Input.TextArea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="在这里记点东西吧……"
          autoSize={{ minRows: 8, maxRows: 8 }}
          maxLength={1000}
          showCount
        />
      </div>
      <Container
        style={{
          margin: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text size="small">
          {saving ? "保存中……" : savedAt ? `已自动保存 ${savedAt}` : "输入后自动保存"}
        </Text>
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          loading={deleting}
          className="need-interaction"
          onClick={handleDelete}
        >
          清空
        </Button>
      </Container>
    </Card>
  );
};

export default NoteWindow;
