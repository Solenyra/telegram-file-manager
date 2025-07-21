const fileInput = document.getElementById('fileInput');
const fileListContainer = document.getElementById('file-selection-list');

fileInput.addEventListener('change', () => {
    fileListContainer.innerHTML = '';
    if (fileInput.files.length > 0) {
        for (const file of fileInput.files) {
            const listItem = document.createElement('li');
            const fileSize = (file.size / 1024 / 1024).toFixed(2);
            listItem.innerHTML = `<span>${file.name}</span><small>${fileSize} MB</small>`;
            fileListContainer.appendChild(listItem);
        }
    }
});

document.getElementById('uploadForm').onsubmit = async function (e) {
  e.preventDefault();
  const formData = new FormData();
  if (fileInput.files.length === 0) {
    showNotification('請先選擇至少一個文件', 'error');
    return;
  }
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('files', fileInput.files[i]);
  }
  const caption = e.target.querySelector('input[type="text"]').value;
  if (caption) { formData.append('caption', caption); }

  const submitButton = e.target.querySelector('button[type="submit"]');
  const progressArea = document.getElementById('progressArea');
  const progressBar = document.getElementById('progressBar');

  submitButton.disabled = true;
  submitButton.textContent = '上傳中...';
  progressArea.style.display = 'block';
  progressBar.style.width = '0%';
  progressBar.textContent = '0%';

  const config = {
    onUploadProgress: function(progressEvent) {
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        progressBar.style.width = percentCompleted + '%';
        progressBar.textContent = percentCompleted + '%';
      }
    }
  };

  try {
    const res = await axios.post('/upload', formData, config);
    if (res.data.success) {
      // *** 關鍵修正 4：更詳細的錯誤反饋 ***
      const failedUploads = res.data.results.filter(r => !r.success);
      if (failedUploads.length > 0) {
        const firstError = failedUploads[0].error?.description || '未知錯誤';
        showNotification(`有 ${failedUploads.length} 個文件上傳失敗。錯誤: ${firstError}`, 'error');
      } else {
        showNotification('所有文件上傳成功！', 'success');
      }
      e.target.reset();
      fileListContainer.innerHTML = '';
    } else {
      showNotification(res.data.message || '上傳請求失敗', 'error');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || '網絡或服務器錯誤';
    showNotification(`上傳失敗: ${errorMessage}`, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '上傳';
    setTimeout(() => { progressArea.style.display = 'none'; }, 2000);
  }
};

function showNotification(message, type = 'info') {
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) { existingNotif.remove(); }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
    }, 5000); // 延長錯誤提示時間
}
