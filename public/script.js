document.getElementById('uploadForm').onsubmit = async function (e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const submitButton = e.target.querySelector('button[type="submit"]');
  
  // 禁用按钮防止重复提交
  submitButton.disabled = true;
  submitButton.textContent = '上传中...';

  try {
    const res = await axios.post('/upload', formData);
    if (res.data.success) {
      showNotification('上传成功', 'success');
      loadFiles();
      e.target.reset(); // 清空表单
    } else {
      showNotification(`上传失败: ${res.data.message}`, 'error');
    }
  } catch (error) {
    const errorMessage = error.response ? error.response.data.message : '网络错误或服务器无响应';
    showNotification(`上传失败: ${errorMessage}`, 'error');
  } finally {
    // 重新启用按钮
    submitButton.disabled = false;
    submitButton.textContent = '上传';
  }
};

async function loadFiles() {
  try {
    const res = await axios.get('/files');
    const list = document.getElementById('fileList');
    list.innerHTML = ''; // 清空列表
    res.data.forEach(file => {
      const item = document.createElement('li');
      item.innerHTML = `
        <span>${file.fileName} (${new Date(file.date).toLocaleString()})</span>
        <button onclick="del(${file.message_id})">删除</button>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    showNotification('加载文件列表失败', 'error');
  }
}

async function del(msgId) {
  if (!confirm('确定要删除这个文件吗？')) {
    return;
  }
  
  try {
    await axios.post('/delete', { message_id: msgId });
    showNotification('删除成功', 'success');
    loadFiles(); // 重新加载列表
  } catch (error) {
    const errorMessage = error.response ? error.response.data.message : '删除失败';
    showNotification(errorMessage, 'error');
  }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 初始加载文件
loadFiles();
