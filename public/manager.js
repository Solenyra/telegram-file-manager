document.addEventListener('DOMContentLoaded', () => {
    const fileGrid = document.getElementById('fileGrid');
    const searchInput = document.getElementById('searchInput');
    const categoriesContainer = document.getElementById('categories');
    const modal = document.getElementById('previewModal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.querySelector('.close-button');
    const actionBar = document.getElementById('actionBar');
    const selectionCountSpan = document.getElementById('selectionCount');
    const renameBtn = document.getElementById('renameBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    let allFiles = [];
    let selectedFiles = new Set();

    const getFileCategory = (mimetype) => { /* ... 之前的代碼保持不變 ... */ };
    const getFileIcon = (category) => { /* ... */ };

    const updateActionBar = () => {
        const count = selectedFiles.size;
        if (count > 0) {
            actionBar.classList.add('visible');
            selectionCountSpan.textContent = `已選擇 ${count} 個文件`;
        } else {
            actionBar.classList.remove('visible');
        }
        renameBtn.disabled = count !== 1;
        downloadBtn.disabled = count === 0;
    };

    const renderFiles = (filesToRender) => {
        fileGrid.innerHTML = '';
        if (filesToRender.length === 0) {
            fileGrid.innerHTML = '<p>沒有找到符合條件的文件。</p>';
            return;
        }
        filesToRender.forEach(file => {
            const category = getFileCategory(file.mimetype);
            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.messageId = file.message_id;
            if (selectedFiles.has(file.message_id)) {
                card.classList.add('selected');
            }
            card.innerHTML = `
                <div class="checkbox-container"><i class="fas fa-check"></i></div>
                <div class="file-icon" data-category="${category}">
                    ${getFileIcon(category)}
                </div>
                <div class="file-info">
                    <h5 title="${file.fileName}">${file.fileName}</h5>
                    <p>${new Date(file.date).toLocaleString()}</p>
                </div>
            `;
            fileGrid.appendChild(card);
        });
    };

    const filterAndRender = () => { /* ... 之前的代碼保持不變 ... */ };

    async function loadFiles() { /* ... */ }

    searchInput.addEventListener('input', filterAndRender);
    categoriesContainer.addEventListener('click', (e) => { /* ... */ });

    fileGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.file-card');
        if (!card) return;
        const messageId = parseInt(card.dataset.messageId, 10);
        
        if (selectedFiles.has(messageId)) {
            selectedFiles.delete(messageId);
            card.classList.remove('selected');
        } else {
            selectedFiles.add(messageId);
            card.classList.add('selected');
        }
        updateActionBar();
    });

    renameBtn.addEventListener('click', async () => {
        const messageId = selectedFiles.values().next().value;
        const file = allFiles.find(f => f.message_id === messageId);
        const newFileName = prompt('請輸入新的文件名:', file.fileName);

        if (newFileName && newFileName.trim() !== '' && newFileName !== file.fileName) {
            try {
                const res = await axios.post('/rename', { messageId, newFileName: newFileName.trim() });
                if (res.data.success) {
                    alert('重命名成功');
                    selectedFiles.clear();
                    updateActionBar();
                    await loadFiles();
                } else {
                    alert('重命名失敗: ' + (res.data.message || '未知錯誤'));
                }
            } catch (error) {
                alert('重命名請求失敗');
            }
        }
    });

    deleteBtn.addEventListener('click', async () => {
        if (selectedFiles.size === 0) return;
        if (confirm(`確定要永久删除這 ${selectedFiles.size} 個文件嗎？`)) {
            try {
                const res = await axios.post('/delete-multiple', { messageIds: Array.from(selectedFiles) });
                alert(`成功删除 ${res.data.success.length} 個文件。`);
                selectedFiles.clear();
                updateActionBar();
                await loadFiles();
            } catch (error) {
                alert('刪除請求失敗');
            }
        }
    });
    
    downloadBtn.addEventListener('click', async () => {
        for (const messageId of selectedFiles) {
            const file = allFiles.find(f => f.message_id === messageId);
            if (file) {
                try {
                    const res = await axios.get(`/file/${messageId}`);
                    if (res.data.success) {
                        const a = document.createElement('a');
                        a.href = res.data.url;
                        a.download = file.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        await new Promise(resolve => setTimeout(resolve, 300)); // 防止瀏覽器攔截彈窗
                    }
                } catch (error) {
                    console.error(`下載文件 ${file.fileName} 失敗`);
                }
            }
        }
    });

    closeModal.onclick = () => { /* ... */ };
    loadFiles();
});
