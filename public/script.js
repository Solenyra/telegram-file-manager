document.getElementById('uploadForm').onsubmit = async function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const fileInput = e.target.querySelector('input[type="file"]');
  
  if (!fileInput.files.length) {
    showNotification('請先選擇一個文件', 'error');
    return;
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
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      progressBar.style.width = percentCompleted + '%';
      progressBar.textContent = percentCompleted + '%';
    }
  };

  try {
    const res = await axios.post('/upload', formData, config);
    if (res.data.success) {
      showNotification('上傳成功', 'success');
      e.target.reset();
    } else {
      const errorMessage = res.data.error ? res.data.error.description : '上傳失敗';
      showNotification(`上傳失敗: ${errorMessage}`, 'error');
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
        notification.remove();
    }, 4000);
}
