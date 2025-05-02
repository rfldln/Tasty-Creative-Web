import ChattingManagersList from "./ChattingManagersList";
import ChattingManagersManage from "./ChattingManagersManage";

const ChattingManagers = ({ hash }: { hash: string }) => {
  const chattingManagersTab = () => {
    if (hash === "#chatting-managers-list") {
      return <ChattingManagersList />;
    }
    if (hash === "#chatting-managers-manage") {
      return <ChattingManagersManage />;
    }
    return null;
  };

  return <div>{chattingManagersTab()}</div>;
};

export default ChattingManagers;
