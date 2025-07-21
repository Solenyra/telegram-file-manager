#!/bin/bash

# 设置颜色变量，用于美化输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}--- 开始安装 Telegram 文件管理器 ---${NC}"

# 1. 克隆项目仓库
echo -e "\n${YELLOW}[1/4] 正在从 GitHub 克隆项目...${NC}"
git clone https://github.com/Limkon/telegram-file-manager.git
if [ $? -ne 0 ]; then
    echo "错误：克隆项目失败。请检查 Git 是否已安装以及网络连接是否正常。"
    exit 1
fi
cd telegram-file-manager

# 2. 安装项目依赖
echo -e "\n${YELLOW}[2/4] 正在安装 Node.js 依赖 (npm install)...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo "错误：'npm install' 失败。请检查 Node.js 和 npm 是否已正确安装。"
    exit 1
fi

# 3. 从模板创建配置文件
echo -e "\n${YELLOW}[3/4] 正在创建 .env 配置文件...${NC}"
if [ -f ".evn" ]; then
    cp .evn .env
else
    echo "警告：未找到模板文件 '.evn'。"
fi

# 4. 生成一个随机的 SESSION_SECRET 并添加到 .env 文件
# 这增强了安全性，用户无需手动设置
echo -e "\n${YELLOW}[4/4] 正在生成并添加安全的会话密钥...${NC}"
# 使用 Node.js 的 crypto 模块生成一个安全的随机字符串
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "SESSION_SECRET=${SESSION_SECRET}" >> .env

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}✅ 基础安装和配置已成功完成！${NC}"
echo -e "${YELLOW}下一步关键操作:${NC}"
echo "  1. 请使用文本编辑器打开 'telegram-file-manager' 目录下的 '.env' 文件。"
echo "     例如，运行命令: ${GREEN}nano telegram-file-manager/.env${NC}"
echo "  2. 在文件中填入您自己的个人信息:"
echo "     - BOT_TOKEN"
echo "     - CHANNEL_ID"
echo "     - ADMIN_USER"
echo "     - ADMIN_PASS"
echo "  3. 配置完成后，进入项目目录并启动应用:"
echo "     ${GREEN}cd telegram-file-manager${NC}"
echo "     ${GREEN}npm start${NC}"
echo -e "${GREEN}================================================================${NC}"
