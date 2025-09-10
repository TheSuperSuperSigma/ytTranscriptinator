class YTTranscriptinator {
    constructor() {
        this.currentVideoInfo = null;
        this.currentTranscription = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTranscriptions();
    }

    bindEvents() {
        document.getElementById('getTranscriptBtn').addEventListener('click', () => this.getVideoInfo());
        document.getElementById('transcribeBtn').addEventListener('click', () => this.transcribeVideo());
        document.getElementById('bulkTranscribeBtn').addEventListener('click', () => this.bulkTranscribe());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadTranscription());
        
        // Enter key support for URL input
        document.getElementById('videoUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.getVideoInfo();
            }
        });
    }

    async getVideoInfo() {
        const url = document.getElementById('videoUrl').value.trim();
        
        if (!url) {
            this.showError('Please enter a YouTube URL');
            return;
        }

        if (!this.isValidYouTubeUrl(url)) {
            this.showError('Please enter a valid YouTube URL');
            return;
        }

        try {
            this.showLoading('Getting video information...');
            
            const response = await fetch('/api/video-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentVideoInfo = data;
                this.displayVideoInfo(data);
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to get video information');
            console.error('Error:', error);
        }
    }

    async transcribeVideo() {
        if (!this.currentVideoInfo) {
            this.showError('Please get video information first');
            return;
        }

        try {
            this.showProgress();
            
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: document.getElementById('videoUrl').value })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentTranscription = data;
                this.showResult(data);
                this.loadTranscriptions(); // Refresh the list
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to transcribe video');
            console.error('Error:', error);
        }
    }

    async bulkTranscribe() {
        const urlsText = document.getElementById('bulkUrls').value.trim();
        
        if (!urlsText) {
            this.showError('Please enter YouTube URLs');
            return;
        }

        const urls = urlsText.split('\n').map(url => url.trim()).filter(url => url);
        
        if (urls.length === 0) {
            this.showError('Please enter valid YouTube URLs');
            return;
        }

        // Validate all URLs
        for (const url of urls) {
            if (!this.isValidYouTubeUrl(url)) {
                this.showError(`Invalid YouTube URL: ${url}`);
                return;
            }
        }

        try {
            this.showBulkProgress(urls.length);
            
            const response = await fetch('/api/bulk-transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urls })
            });

            const data = await response.json();

            if (response.ok) {
                this.showBulkResult(data);
                this.loadTranscriptions(); // Refresh the list
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to bulk transcribe videos');
            console.error('Error:', error);
        }
    }

    async downloadTranscription() {
        if (!this.currentTranscription) {
            this.showError('No transcription to download');
            return;
        }

        try {
            const response = await fetch(`/api/download/${this.currentTranscription.filename}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.currentTranscription.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                this.showError('Failed to download transcription');
            }
        } catch (error) {
            this.showError('Failed to download transcription');
            console.error('Error:', error);
        }
    }

    async loadTranscriptions() {
        try {
            const response = await fetch('/api/transcriptions');
            const transcriptions = await response.json();
            this.displayTranscriptions(transcriptions);
        } catch (error) {
            console.error('Error loading transcriptions:', error);
            document.getElementById('transcriptionsList').innerHTML = 
                '<div class="loading">Failed to load transcriptions</div>';
        }
    }

    displayVideoInfo(videoInfo) {
        const videoInfoDiv = document.getElementById('videoInfo');
        const thumbnail = document.getElementById('thumbnail');
        const title = document.getElementById('videoTitle');
        const duration = document.getElementById('videoDuration');

        // Set thumbnail (using YouTube thumbnail API)
        thumbnail.src = `https://img.youtube.com/vi/${videoInfo.videoId}/maxresdefault.jpg`;
        thumbnail.alt = videoInfo.title;

        title.textContent = videoInfo.title;
        duration.textContent = this.formatDuration(videoInfo.duration);

        videoInfoDiv.classList.remove('hidden');
        this.hideLoading();
    }

    displayTranscriptions(transcriptions) {
        const listDiv = document.getElementById('transcriptionsList');
        
        if (transcriptions.length === 0) {
            listDiv.innerHTML = `
                <div class="no-transcriptions">
                    <i class="fas fa-file-text"></i>
                    <h3>No Previous Transcriptions</h3>
                    <p>Start by transcribing your first YouTube video!</p>
                </div>
            `;
            return;
        }

        listDiv.innerHTML = transcriptions.map(transcription => `
            <div class="transcription-item">
                <div class="transcription-info">
                    <h4>${transcription.title}</h4>
                    <p>Created: ${new Date(transcription.created).toLocaleString()}</p>
                </div>
                <div class="transcription-actions">
                    <button class="btn btn-small btn-download" onclick="transcriber.downloadTranscriptionFile('${transcription.filename}')">
                        <i class="fas fa-download"></i>
                        Download
                    </button>
                </div>
            </div>
        `).join('');
    }

    async downloadTranscriptionFile(filename) {
        try {
            const response = await fetch(`/api/download/${filename}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                this.showError('Failed to download transcription');
            }
        } catch (error) {
            this.showError('Failed to download transcription');
            console.error('Error:', error);
        }
    }

    showProgress() {
        document.getElementById('progressSection').classList.remove('hidden');
        document.getElementById('resultSection').classList.add('hidden');
        
        // Simulate progress
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;
            
            progressFill.style.width = progress + '%';
            
            if (progress < 30) {
                progressText.textContent = 'Downloading video...';
            } else if (progress < 70) {
                progressText.textContent = 'Processing audio...';
            } else if (progress < 100) {
                progressText.textContent = 'Transcribing...';
            } else {
                progressText.textContent = 'Complete!';
                clearInterval(interval);
            }
        }, 200);
    }

    showBulkProgress(totalVideos) {
        document.getElementById('progressSection').classList.remove('hidden');
        document.getElementById('resultSection').classList.add('hidden');
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        let currentVideo = 0;
        const interval = setInterval(() => {
            currentVideo++;
            const progress = (currentVideo / totalVideos) * 100;
            
            progressFill.style.width = progress + '%';
            progressText.textContent = `Processing video ${currentVideo} of ${totalVideos}...`;
            
            if (currentVideo >= totalVideos) {
                progressText.textContent = 'Complete!';
                clearInterval(interval);
            }
        }, 1000);
    }

    showResult(data) {
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('resultSection').classList.remove('hidden');
        
        const resultMessage = document.getElementById('resultMessage');
        resultMessage.textContent = `"${data.title}" has been transcribed successfully!`;
    }

    showBulkResult(data) {
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('resultSection').classList.remove('hidden');
        
        const resultMessage = document.getElementById('resultMessage');
        const successCount = data.results.filter(r => r.success).length;
        const totalCount = data.results.length;
        
        resultMessage.textContent = `Bulk transcription complete! ${successCount} of ${totalCount} videos transcribed successfully.`;
        
        // Hide download button for bulk results
        document.getElementById('downloadBtn').style.display = 'none';
    }

    showLoading(message) {
        // You can implement a loading overlay here if needed
        console.log(message);
    }

    hideLoading() {
        // Hide loading overlay if implemented
    }

    showError(message) {
        alert(message); // You can replace this with a better error display
    }

    isValidYouTubeUrl(url) {
        const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
        return regex.test(url);
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

// Initialize the application
const transcriber = new YTTranscriptinator();