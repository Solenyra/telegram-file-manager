#!/bin/bash

# 設置顏色變量，用於美化輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}--- 開始安裝 Telegram 文件管理器 ---${NC}"

# 檢查並刪除已存在的舊目錄，以便可以重複運行此腳本
if [ -d "telegram-file-manager" ]; then
    echo -e "${YELLOW}檢測到已存在的 'telegram-file-manager' 目錄，正在移除舊目錄...${NC}"
    rm -rf telegram-file-manager
fi

# 1. 克隆項目倉庫
echo -e "\n${YELLOW}[1/4] 正在從 GitHub 克隆項目...${NC}"
git clone https://github.com/Limkon/telegram-file-manager.git
if [ $? -ne 0 ]; then
    echo "錯誤：克隆項目失敗。請檢查 Git 是否已安裝以及網絡連接是否正常。"
    exit 1
fi
cd telegram-file-manager

# 2. 安裝項目依賴
echo -e "\n${YELLOW}[2/4] 正在安裝 Node.js 依賴 (npm install)...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo "錯誤：'npm install' 失敗。請檢查 Node.js 和 npm 是否已正確安裝。"
    exit 1
fi

# 3. 創建配置文件
echo -e "\n${YELLOW}[3/4] 正在創建 .env 配置文件...${NC}"
# 倉庫中的模板文件名是 .evn (有拼寫錯誤)，我們將其複製為標準的 .env 文件
if [ -f ".evn" ]; then
    cp .evn .env
    echo "已將倉庫中的 .evn 文件複製為標準的 .env 文件。"
else
    echo "警告：未找到模板文件 '.evn'。"
fi

# 4. 生成一個隨機的 SESSION_SECRET 並添加到 .env 文件
echo -e "\n${YELLOW}[4/4] 正在生成並添加安全的會話密鑰...${NC}"
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "SESSION_SECRET=${SESSION_SECRET}" >> .env

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}✅ 安裝和配置已成功完成！${NC}"
echo -e "${YELLOW}下一步關鍵操作:${NC}"
echo "  1. 請使用文本編輯器打開 '.env' 文件。"
echo "     例如，運行命令: ${GREEN}nano .env${NC}"
echo "  2. 在文件中填入您自己的個人信息 (BOT_TOKEN, CHANNEL_ID 等)。"
echo "  3. 配置完成後，請啟動應用:"
echo "     ${GREEN}npm start${NC}"
echo -e "${GREEN}================================================================${NC}"
