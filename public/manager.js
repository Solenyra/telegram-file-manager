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

    const getFileCategory = (mimetype) => {
        if (!mimetype) return 'other';
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        if (mimetype.startsWith('application/pdf') || mimetype.startsWith('text/') || mimetype.includes('document')) return 'document';
        if (mimetype.startsWith('application/zip') || mimetype.startsWith('application/x-rar-compressed') || mimetype.includes('archive')) return 'archive';
        return 'other';
    };

    const getFileIcon = (category) => {
        const icons = { image: 'fa-file-image', video: 'fa-file-video', audio: 'fa-file-audio', document: 'fa-file-alt', archive: 'fa-file-archive', other: 'fa-file' };
        return `<i class="fas ${icons[category] || icons.other}"></i>`;
    };

    const updateActionBar = () => {
        const count = selectedFiles.size;
        
        // *** 關鍵修正：智能顯示選中信息 ***
        if (count === 1) {
            const singleFileId = selectedFiles.values().next().value;
            const file = allFiles.find(f => f.message_id === singleFileId);
            selectionCountSpan.textContent = file ? `已選擇: ${file.fileName}` : '已選擇 1 個文件';
            selectionCountSpan.title = file ? file.fileName : '';
        } else {
            selectionCountSpan.textContent = `已選擇 ${count} 個文件`;
            selectionCountSpan.title = '';
        }
        
        renameBtn.disabled = count !== 1;
        downloadBtn.disabled = count === 0;
        deleteBtn.disabled = count === 0;

        if (count > 0) {
            actionBar.classList.add('visible');
        } else {
            actionBar.classList.remove('visible');
        }
    };

    const renderFiles = (filesToRender) => {
        fileGrid.innerHTML = '';
        if (filesToRender.length === 0) {
            fileGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">沒有找到符合條件的文件。</p>';
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
            // 移除了 checkbox-container 的 HTML，因為它已經被 CSS 隱藏了
            card.innerHTML = `
                <div class="file-icon" data-category="${category}">${getFileIcon(category)}</div>
                <div class="file-info">
                    <h5 title="${file.fileName}">${file.fileName}</h5>
                    <p>${new Date(file.date).toLocaleString()}</p>
                </div>
            `;
            fileGrid.appendChild(card);
        });
    };
    
    const filterAndRender = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const activeCategory = categoriesContainer.querySelector('.active').dataset.category;
        const filtered = allFiles.filter(file => 
            (activeCategory === 'all' || getFileCategory(file.mimetype) === activeCategory) &&
            file.fileName.toLowerCase().includes(searchTerm)
        );
        renderFiles(filtered);
    };

    async function loadFiles() {
        try {
            const res = await axios.get('/files');
            allFiles = res.data.sort((a, b) => b.date - a.date);
            
            const existingSelected = new Set();
            allFiles.forEach(file => {
                if(selectedFiles.has(file.message_id)) {
                    existingSelected.add(file.message_id);
                }
            });
            selectedFiles = existingSelected;
            
            updateActionBar();
            filterAndRender();
        } catch (error) {
            fileGrid.innerHTML = '<p>加載文件失敗，請稍後重試。</p>';
        }
    }

    // --- 事件監聽 (保持不變) ---
    searchInput.addEventListener('input', filterAndRender);
    categoriesContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            categoriesContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            filterAndRender();
        }
    });

    fileGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.file-card');
        if (!card) return;
        const messageId = parseInt(card.dataset.messageId, 10);
        
        card.classList.toggle('selected');
        if (selectedFiles.has(messageId)) {
            selectedFiles.delete(messageId);
        } else {
            selectedFiles.add(messageId);
        }
        updateActionBar();
    });

    renameBtn.addEventListener('click', async () => {
        if (renameBtn.disabled) return;
        const messageId = selectedFiles.values().next().value;
        const file = allFiles.find(f => f.message_id === messageId);
        const newFileName = prompt('請輸入新的文件名:', file.fileName);

        if (newFileName && newFileName.trim() !== '' && newFileName !== file.fileName) {
            try {
                const res = await axios.post('/rename', { messageId, newFileName: newFileName.trim() });
                if (res.data.success) {
                    selectedFiles.clear();
                    await loadFiles();
                } else { alert('重命名失敗: ' + (res.data.message || '未知錯誤')); }
            } catch (error) { alert('重命名請求失敗'); }
        }
    });

    deleteBtn.addEventListener('click', async () => {
        if (deleteBtn.disabled) return;
        if (confirm(`確定要永久删除這 ${selectedFiles.size} 個文件嗎？`)) {
            try {
                const res = await axios.post('/delete-multiple', { messageIds: Array.from(selectedFiles) });
                alert(`成功删除 ${res.data.success.length} 個文件。`);
                selectedFiles.clear();
                await loadFiles();

            } catch (error) { alert('刪除請求失敗'); }
        }
    });
    
    downloadBtn.addEventListener('click', async () => {
        if (downloadBtn.disabled) return;
        if(selectedFiles.size > 5) {
            alert('為防止瀏覽器攔截，一次最多下載5個文件。請減少您的選擇。');
            return;
        }
        alert(`即將開始下載 ${selectedFiles.size} 個文件。請允許您的瀏覽器彈出多個窗口。`);

        for (const messageId of selectedFiles) {
            const file = allFiles.find(f => f.message_id === messageId);
            if (file) {
                try {
                    const res = await axios.get(`/file/${messageId}`);
                    if (res.data.success) {
                        window.open(res.data.url, '_blank');
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) { console.error(`下載文件 ${file.fileName} 失敗`); }
            }
        }
    });
    
    closeModal.onclick = () => {
        modal.style.display = 'none';
        modalContent.innerHTML = '';
    };

    loadFiles();
});
