// ===== 改动一：亮色/暗色模式切换 =====
// 点击按钮切换主题，选择保存在 localStorage 里，下次打开保持上次的选择
const themeButtonDOM = document.getElementById("theme-toggle");

const applyTheme = (theme) => {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  themeButtonDOM.innerText = isDark ? "🌞 亮色模式" : "🌙 暗色模式";
  localStorage.setItem("aboutMeTheme", theme);
};

let currentTheme = localStorage.getItem("aboutMeTheme") ?? "light";
applyTheme(currentTheme);

themeButtonDOM.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(currentTheme);
});

// ===== 改动二：实时获取 GitHub 公开信息（网络资源） =====
// 使用 GitHub 官方 API：https://docs.github.com/rest/users/users#get-a-user
const githubStatsDOM = document.getElementById("github-stats");
const getGithubStats = async (objDOM) => {
  try {
    const response = await fetch("https://api.github.com/users/l-c-y1020");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    objDOM.innerHTML = `公共仓库 <strong>${data.public_repos}</strong> 个 · 关注者 <strong>${data.followers}</strong> 人`;
  }
  catch (err) {
    console.error(err);
    objDOM.innerText = "GitHub 信息加载失败";
  }
};
getGithubStats(githubStatsDOM);
