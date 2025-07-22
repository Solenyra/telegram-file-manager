document.addEventListener('DOMContentLoaded', () => {
    const fileGrid = document.getElementById('fileGrid');
    const searchInput = document.getElementById('searchInput');
    const categoriesContainer = document.getElementById('categories');
    const modal = document.getElementById('previewModal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.querySelector('.close-button');
    const actionBar = document.getElementById('actionBar');
    const selectionCountSpan = document.getElementById('selectionCount');
    const previewBtn = document.getElementById('previewBtn');
    const renameBtn = document.getElementById('renameBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');

    let allFiles = [];
    let selectedFiles = new Set();
    let currentVisibleFiles = [];

    const getFileCategory = (mimetype) => {
        if (!mimetype) return 'other';
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        if (mimetype.startsWith('text/') || mimetype === 'application/json' || mimetype === 'application/xml') return 'document';
        if (mimetype.startsWith('application/pdf') || mimetype.includes('document')) return 'document';
        if (mimetype.startsWith('application/zip') || mimetype.startsWith('application/x-rar-compressed') || mimetype.includes('archive')) return 'archive';
        return 'other';
    };

    const getFileIcon = (category) => {
        const icons = { image: 'fa-file-image', video: 'fa-file-video', audio: 'fa-file-audio', document: 'fa-file-alt', archive: 'fa-file-archive', other: 'fa-file' };
        return `<i class="fas ${icons[category] || icons.other}"></i>`;
    };

    const updateActionBar = () => {
        const count = selectedFiles.size;
        
        if (count === 1) {
            const singleFileId = selectedFiles.values().next().value;
            const file = allFiles.find(f => f.message_id === singleFileId);
            selectionCountSpan.textContent = file ? `已選擇: ${file.fileName}` : '已選擇 1 個文件';
            selectionCountSpan.title = file ? file.fileName : '';
        } else {
            selectionCountSpan.textContent = `已選擇 ${count} 個文件`;
            selectionCountSpan.title = '';
        }
        
        const canPreview = count === 1 && ['image', 'video', 'audio', 'document'].includes(getFileCategory(allFiles.find(f => f.message_id === selectedFiles.values().next().value)?.mimetype));
        if(previewBtn) previewBtn.disabled = !canPreview;
        if(renameBtn) renameBtn.disabled = count !== 1;
        if(downloadBtn) downloadBtn.disabled = count === 0;
        if(deleteBtn) deleteBtn.disabled = count === 0;

        if (count > 0) {
            actionBar.classList.add('visible');
        } else {
            actionBar.classList.remove('visible');
        }

        if (currentVisibleFiles.length > 0 && count === currentVisibleFiles.length) {
            selectAllBtn.innerHTML = '<i class="fas fa-times"></i>';
            selectAllBtn.title = '取消全選';
        } else {
            selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i>';
            selectAllBtn.title = '全選可見文件';
        }
    };

    const renderFiles = (filesToRender) => {
        currentVisibleFiles = filesToRender;
        fileGrid.innerHTML = '';
        if (filesToRender.length === 0) {
            fileGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">沒有找到符合條件的文件。</p>';
            updateActionBar();
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
                <div class="file-icon" data-category="${category}">${getFileIcon(category)}</div>
                <div class="file-info">
                    <h5 title="${file.fileName}">${file.fileName}</h5>
                    <p>${new Date(file.date).toLocaleString()}</p>
                </div>
            `;
            fileGrid.appendChild(card);
        });
        updateActionBar();
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
            
            filterAndRender();
        } catch (error) {
            fileGrid.innerHTML = '<p>加載文件失敗，請稍後重試。</p>';
        }
    }

    // --- 事件監聽 ---
    if(searchInput) searchInput.addEventListener('input', filterAndRender);
    
    if(categoriesContainer) {
        categoriesContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                categoriesContainer.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                filterAndRender();
            }
        });
    }

    if(fileGrid) {
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
    }

    if(selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const allVisibleIds = currentVisibleFiles.map(f => f.message_id);
            const allCurrentlySelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedFiles.has(id));

            if (allCurrentlySelected) {
                allVisibleIds.forEach(id => selectedFiles.delete(id));
            } else {
                allVisibleIds.forEach(id => selectedFiles.add(id));
            }
            
            renderFiles(currentVisibleFiles);
        });
    }
    
    if(previewBtn) {
        previewBtn.addEventListener('click', async () => {
            if (previewBtn.disabled) return;
            
            const messageId = selectedFiles.values().next().value;
            const file = allFiles.find(f => f.message_id === messageId);
            if (!file) return;

            modalContent.innerHTML = '正在加載預覽...';
            modal.style.display = 'flex';

            const category = getFileCategory(file.mimetype);

            try {
                if (category === 'document' && (file.mimetype.startsWith('text/') || ['application/json', 'application/xml'].includes(file.mimetype))) {
                    const res = await axios.get(`/file/content/${messageId}`);
                    modalContent.innerHTML = `<pre>${escapeHtml(res.data)}</pre>`;
                } else {
                    const res = await axios.get(`/file/${messageId}`);
                    if (res.data.success) {
                        const url = res.data.url;
                        if (category === 'image') {
                            modalContent.innerHTML = `<img src="${url}" alt="預覽">`;
                        } else if (category === 'video') {
                            modalContent.innerHTML = `<video controls autoplay src="${url}"></video>`;
                        } else if (category === 'audio') {
                            modalContent.innerHTML = `<audio controls autoplay src="${url}"></audio>`;
                        } else {
                            modalContent.innerHTML = `此文件類型 (${file.mimetype}) 不支持直接預覽，請下載後查看。`;
                        }
                    } else {
                        throw new Error('無法獲取文件鏈接');
                    }
                }
            } catch (error) {
                modalContent.innerHTML = '預覽失敗，此文件可能不支持或已損壞。';
            }
        });
    }
    
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    if(renameBtn) {
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
    }

    if(deleteBtn) {
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
    }
    
    if(downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (downloadBtn.disabled) return;
            
            // 使用 window.location.href 觸發下載
            selectedFiles.forEach(messageId => {
                window.location.href = `/download/proxy/${messageId}`;
            });
        });
    }
    
    if(closeModal) {
        closeModal.onclick = () => {
            modal.style.display = 'none';
            modalContent.innerHTML = '';
        };
    }

    loadFiles();
});
