document.getElementById('uploadForm').onsubmit = async function (e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await axios.post('/upload', formData);
  alert('上传成功');
  loadFiles();
};

async function loadFiles() {
  const res = await axios.get('/files');
  const list = document.getElementById('fileList');
  list.innerHTML = '';
  res.data.forEach(file => {
    const item = document.createElement('li');
    item.innerHTML = `${file.fileName} <button onclick="del(${file.message_id})">删除</button>`;
    list.appendChild(item);
  });
}

async function del(msgId) {
  await axios.post('/delete', { message_id: msgId });
  loadFiles();
}

loadFiles();