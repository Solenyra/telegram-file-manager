#!/bin/bash

# 設置顏色變量
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}--- 開始安裝 Telegram 文件管理器 (直接部署到當前目錄) ---${NC}"
echo -e "${RED}================================================================${NC}"
echo -e "${YELLOW}警告：此腳本會將所有項目文件直接解壓到您當前的目錄中！${NC}"
echo -e "${YELLOW}為安全起見，強烈建議在一個新建的空文件夾中運行此命令。${NC}"
echo -e "${RED}================================================================${NC}"
# 等待5秒，給用戶時間閱讀警告
sleep 5

# 1. 下載並解壓項目到當前目錄
echo -e "\n${YELLOW}[1/5] 正在下載並解壓項目文件...${NC}"
# 使用 curl 下載 tar.gz 壓縮包，並通過管道傳給 tar 命令解壓
# --strip-components=1 是一個關鍵參數，它會移除壓縮包裡的第一層文件夾，實現直接解壓到當前目錄
curl -L https://github.com/Limkon/telegram-file-manager/archive/refs/heads/master.tar.gz | tar -xz --strip-components=1 || { echo -e "${RED}錯誤：下載或解壓失敗。請檢查網絡和 curl/tar 命令。${NC}"; exit 1; }

# 2. 安裝依賴
echo -e "\n${YELLOW}[2/5] 正在安裝 Node.js 依賴...${NC}"
npm install || { echo -e "${RED}錯誤：'npm install' 失敗。${NC}"; exit 1; }

# 3. 修復安全漏洞
echo -e "\n${YELLOW}[3/5] 正在修復 Multer 安全漏洞 (CVE-2022-24434)...${NC}"
npm install multer@1.4.4-lts.1 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}警告：自動修復漏洞失敗，建議手動檢查。${NC}"
fi

# 4. 創建配置文件
echo -e "\n${YELLOW}[4/5] 正在創建 .env 配置文件...${NC}"
if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "已從 .env.example 創建 .env 文件。"
elif [ -f ".evn" ]; then
    cp .evn .env
    echo "已從舊的 .evn 文件創建 .env 文件。"
else
    echo "未找到模板文件，正在創建一個新的 .env 文件..."
    cat > .env << EOL
BOT_TOKEN=
CHANNEL_ID=
ADMIN_USER=admin
ADMIN_PASS=
EOL
fi

# 5. 生成並添加會話密鑰
echo -e "\n${YELLOW}[5/5] 正在生成並添加安全的會話密鑰...${NC}"
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "SESSION_SECRET=${SESSION_SECRET}" >> .env

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}✅ 所有文件已成功部署到當前目錄！${NC}"
echo -e "${YELLOW}下一步操作:${NC}"
echo "  1. 請使用文本編輯器打開當前目錄下的 '.env' 文件。"
echo "     例如，運行命令: ${GREEN}nano .env${NC}"
echo "  2. 在文件中填入您自己的個人信息 (BOT_TOKEN, CHANNEL_ID, ADMIN_PASS)。"
echo "  3. 配置完成後，請直接啟動應用:"
echo "     ${GREEN}npm start${NC}"
echo -e "${GREEN}================================================================${NC}"
