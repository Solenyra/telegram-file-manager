document.getElementById('uploadForm').onsubmit = async function (e) {
  e.preventDefault();

  const formData = new FormData();
  const fileInput = e.target.querySelector('input[type="file"]');
  
  if (fileInput.files.length === 0) {
    showNotification('請先選擇至少一個文件', 'error');
    return;
  }
  
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('files', fileInput.files[i]);
  }
  
  const caption = e.target.querySelector('input[type="text"]').value;
  if (caption) {
    formData.append('caption', caption);
  }

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
      const failedUploads = res.data.results.filter(r => !r.success);
      if (failedUploads.length > 0) {
        showNotification(`有 ${failedUploads.length} 個文件上傳失敗。`, 'error');
      } else {
        showNotification('所有文件上傳成功！', 'success');
      }
      e.target.reset();
    } else {
      showNotification(res.data.message || '上傳請求失敗', 'error');
    }
  } catch (error) {
    const errorMessage = error.response ? (error.response.data.message || '服務器錯誤') : '網絡連接失敗';
    showNotification(`上傳失敗: ${errorMessage}`, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '上傳';
    setTimeout(() => {
        progressArea.style.display = 'none';
    }, 2000);
  }
};

function showNotification(message, type = 'info') {
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
    }, 4000);
}
