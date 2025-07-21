#!/bin/bash

# 设置颜色变量，用于美化输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}--- 开始安装 Telegram 文件管理器 ---${NC}"

# 新增步骤：检查并删除已存在的旧目录
if [ -d "telegram-file-manager" ]; then
    echo -e "${YELLOW}检测到已存在的 'telegram-file-manager' 目录，正在移除旧目录...${NC}"
    rm -rf telegram-file-manager
fi

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
    # 注意：原仓库文件名是 .evn，如果未来改为 .env.example，这里也要相应修改
    cp .evn .env
else
    echo "警告：未找到模板文件 '.evn'。"
fi

# 4. 生成一个随机的 SESSION_SECRET 并添加到 .env 文件
echo -e "\n${YELLOW}[4/4] 正在生成并添加安全的会话密钥...${NC}"
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "SESSION_SECRET=${SESSION_SECRET}" >> .env

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}✅ 安装和配置已成功完成！${NC}"
echo -e "${YELLOW}下一步关键操作:${NC}"
echo "  1. 请使用文本编辑器打开 '.env' 文件。"
echo "     例如，运行命令: ${GREEN}nano .env${NC}"
echo "  2. 在文件中填入您自己的个人信息 (BOT_TOKEN, CHANNEL_ID 等)。"
echo "  3. 配置完成后，请启动应用:"
echo "     ${GREEN}npm start${NC}"
echo -e "${GREEN}================================================================${NC}"
