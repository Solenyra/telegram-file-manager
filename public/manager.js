document.addEventListener('DOMContentLoaded', () => {
    const fileGrid = document.getElementById('fileGrid');
    const searchInput = document.getElementById('searchInput');
    const categoriesContainer = document.getElementById('categories');
    const modal = document.getElementById('previewModal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.querySelector('.close-button');

    let allFiles = [];

    const getFileCategory = (mimetype) => {
        if (!mimetype) return 'other';
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        if (mimetype.startsWith('application/pdf') || mimetype.startsWith('text/') || mimetype.includes('document')) return 'document';
        if (mimetype.startsWith('application/zip') || mimetype.startsWith('application/x-rar-compressed')) return 'archive';
        return 'other';
    };

    const getFileIcon = (category) => {
        const icons = {
            image: 'fa-file-image',
            video: 'fa-file-video',
            audio: 'fa-file-audio',
            document: 'fa-file-alt',
            archive: 'fa-file-archive',
            other: 'fa-file'
        };
        return `<i class="fas ${icons[category] || icons.other}"></i>`;
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
            card.innerHTML = `
                <div class="file-icon" data-category="${category}">
                    ${getFileIcon(category)}
                </div>
                <div class="file-info">
                    <h5 title="${file.fileName}">${file.fileName}</h5>
                    <p>${new Date(file.date).toLocaleString()}</p>
                </div>
                <div class="file-actions">
                    <button class="preview-btn" title="預覽" data-message-id="${file.message_id}" data-mimetype="${file.mimetype}"><i class="fas fa-eye"></i></button>
                    <button class="download-btn" title="下載" data-message-id="${file.message_id}" data-filename="${file.fileName}"><i class="fas fa-download"></i></button>
                    <button class="delete-btn" title="刪除" data-message-id="${file.message_id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            fileGrid.appendChild(card);
        });
    };
    
    const filterAndRender = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const activeCategory = categoriesContainer.querySelector('.active').dataset.category;

        const filteredFiles = allFiles.filter(file => {
            const matchesCategory = activeCategory === 'all' || getFileCategory(file.mimetype) === activeCategory;
            const matchesSearch = file.fileName.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        renderFiles(filteredFiles);
    };

    async function loadFiles() {
        try {
            const res = await axios.get('/files');
            allFiles = res.data.sort((a, b) => b.date - a.date);
            filterAndRender();
        } catch (error) {
            console.error('加載文件列表失敗', error);
            fileGrid.innerHTML = '<p>加載文件失敗，請稍後重試。</p>';
        }
    }

    searchInput.addEventListener('input', filterAndRender);

    categoriesContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            categoriesContainer.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            filterAndRender();
        }
    });

    fileGrid.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const messageId = button.dataset.messageId;

        if (button.classList.contains('delete-btn')) {
            if (confirm('確定要永久删除這個文件嗎？')) {
                try {
                    await axios.post('/delete', { message_id: messageId });
                    loadFiles(); // 重新加載
                } catch (error) {
                    alert('删除失敗');
                }
            }
        }

        if (button.classList.contains('preview-btn') || button.classList.contains('download-btn')) {
            try {
                const res = await axios.get(`/file/${messageId}`);
                if (res.data.success) {
                    const url = res.data.url;
                    if (button.classList.contains('preview-btn')) {
                        const mimetype = button.dataset.mimetype || '';
                        let contentHtml = '';
                        if (mimetype.startsWith('image/')) {
                            contentHtml = `<img src="${url}" alt="預覽">`;
                        } else if (mimetype.startsWith('video/')) {
                            contentHtml = `<video controls src="${url}"></video>`;
                        } else if (mimetype.startsWith('audio/')) {
                            contentHtml = `<audio controls src="${url}"></audio>`;
                        } else {
                            alert('此文件類型不支持直接預覽，請下載後查看。');
                            return;
                        }
                        modalContent.innerHTML = contentHtml;
                        modal.style.display = 'flex';
                    } else { // Download
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = button.dataset.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                }
            } catch (error) {
                alert('獲取文件失敗');
            }
        }
    });

    closeModal.onclick = () => {
        modal.style.display = 'none';
        modalContent.innerHTML = ''; // 清空內容以停止播放
    };

    // Initial load
    loadFiles();
});
