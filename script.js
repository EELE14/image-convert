class ImageConverter {
  constructor() {
    this.files = [];
    this.convertedFiles = [];
    this.outputFormat = "jpeg";
    this.quality = 0.8;
    this.statistics = {
      totalFiles: 0,
      originalSize: 0,
      compressedSize: 0,
      startTime: null,
      endTime: null,
    };

    this.initEventListeners();
    this.initTheme();
  }

  initEventListeners() {
    const uploadZone = document.getElementById("uploadZone");
    const fileInput = document.getElementById("fileInput");
    const convertButton = document.getElementById("convertButton");
    const qualitySlider = document.getElementById("qualitySlider");
    const formatButtons = document.querySelectorAll(".format-option");
    const downloadAllButton = document.getElementById("downloadAllButton");
    const downloadZipButton = document.getElementById("downloadZipButton");
    const themeToggle = document.getElementById("themeToggle");

    uploadZone.addEventListener("click", () => fileInput.click());
    uploadZone.addEventListener("dragover", this.handleDragOver.bind(this));
    uploadZone.addEventListener("dragleave", this.handleDragLeave.bind(this));
    uploadZone.addEventListener("drop", this.handleDrop.bind(this));

    fileInput.addEventListener("change", this.handleFileSelect.bind(this));

    convertButton.addEventListener("click", this.convertImages.bind(this));

    qualitySlider.addEventListener("input", (e) => {
      this.quality = e.target.value / 100;
      document.getElementById("qualityValue").textContent = e.target.value;
    });

    formatButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        formatButtons.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.outputFormat = e.target.dataset.format;
      });
    });

    downloadAllButton.addEventListener("click", this.downloadAll.bind(this));
    downloadZipButton.addEventListener("click", this.downloadAsZip.bind(this));

    themeToggle.addEventListener("click", this.toggleTheme.bind(this));
  }

  initTheme() {
    const savedTheme = localStorage.getItem("imageflow-theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("imageflow-theme", newTheme);
    this.updateThemeIcon(newTheme);
  }

  updateThemeIcon(theme) {
    const themeIcon = document.querySelector("#themeToggle i");
    themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }

  handleDragOver(e) {
    e.preventDefault();
    document.getElementById("uploadZone").classList.add("dragover");
  }

  handleDragLeave(e) {
    e.preventDefault();
    document.getElementById("uploadZone").classList.remove("dragover");
  }

  handleDrop(e) {
    e.preventDefault();
    document.getElementById("uploadZone").classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    this.addFiles(files);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.addFiles(files);
  }

  addFiles(files) {
    files.forEach((file) => {
      if (
        !this.files.find((f) => f.name === file.name && f.size === file.size)
      ) {
        this.files.push({
          file: file,
          name: file.name,
          size: file.size,
          status: "pending",
          convertedBlob: null,
          convertedSize: 0,
        });
      }
    });

    this.updateFileList();
    document.getElementById("convertButton").disabled = this.files.length === 0;
  }

  updateFileList() {
    const fileList = document.getElementById("fileList");
    fileList.innerHTML = "";

    this.files.forEach((fileData, index) => {
      const fileItem = document.createElement("div");
      fileItem.className = "file-item";
      fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">
                        <i class="fas fa-image"></i> ${fileData.name}
                    </div>
                    <div class="file-size">${this.formatBytes(
                      fileData.size
                    )}</div>
                </div>
                <div class="file-status status-${fileData.status}">
                    ${this.getStatusIcon(fileData.status)}
                    ${this.getStatusText(fileData.status)}
                </div>
            `;
      fileList.appendChild(fileItem);
    });
  }

  getStatusIcon(status) {
    const icons = {
      pending: '<i class="fas fa-clock"></i>',
      processing: '<i class="fas fa-spinner fa-spin"></i>',
      completed: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-triangle"></i>',
    };
    return icons[status] || "";
  }

  getStatusText(status) {
    const statusTexts = {
      pending: "Pending",
      processing: "Processing...",
      completed: "Completed",
      error: "Error",
    };
    return statusTexts[status] || "Unknown";
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async convertImages() {
    this.statistics.startTime = Date.now();
    this.statistics.totalFiles = this.files.length;
    this.statistics.originalSize = this.files.reduce(
      (sum, file) => sum + file.size,
      0
    );

    document.getElementById("convertButton").disabled = true;
    document.getElementById("progressBar").classList.remove("hidden");

    const progressFill = document.getElementById("progressFill");
    let completed = 0;

    for (let i = 0; i < this.files.length; i++) {
      const fileData = this.files[i];
      fileData.status = "processing";
      this.updateFileList();

      try {
        const convertedBlob = await this.convertSingleImage(fileData.file);
        fileData.convertedBlob = convertedBlob;
        fileData.convertedSize = convertedBlob.size;
        fileData.status = "completed";
        this.convertedFiles.push(fileData);
      } catch (error) {
        console.error("Conversion error:", error);
        fileData.status = "error";
      }

      completed++;
      const progress = (completed / this.files.length) * 100;
      progressFill.style.width = progress + "%";
      this.updateFileList();

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.statistics.endTime = Date.now();
    this.statistics.compressedSize = this.convertedFiles.reduce(
      (sum, file) => sum + file.convertedSize,
      0
    );

    this.showStatistics();
    document.getElementById("downloadSection").classList.remove("hidden");
    document.getElementById("convertButton").disabled = false;
  }

  async convertSingleImage(file) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(resolve, `image/${this.outputFormat}`, this.quality);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  showStatistics() {
    const stats = this.statistics;
    const processingTime = (stats.endTime - stats.startTime) / 1000;
    const totalReduction =
      ((stats.originalSize - stats.compressedSize) / stats.originalSize) * 100;
    const averageReduction = totalReduction / Math.max(stats.totalFiles, 1);

    document.getElementById("totalFiles").textContent = stats.totalFiles;
    document.getElementById("totalSizeReduction").textContent =
      totalReduction.toFixed(1) + "%";
    document.getElementById("originalSize").textContent = this.formatBytes(
      stats.originalSize
    );
    document.getElementById("compressedSize").textContent = this.formatBytes(
      stats.compressedSize
    );
    document.getElementById("processingTime").textContent =
      processingTime.toFixed(1) + "s";
    document.getElementById("averageReduction").textContent =
      averageReduction.toFixed(1) + "%";

    document.getElementById("statistics").classList.remove("hidden");

    this.animateStatValues();
  }

  animateStatValues() {
    const statValues = document.querySelectorAll(".stat-value");
    statValues.forEach((element, index) => {
      element.style.opacity = "0";
      element.style.transform = "translateY(20px)";

      setTimeout(() => {
        element.style.transition = "all 0.6s ease";
        element.style.opacity = "1";
        element.style.transform = "translateY(0)";
      }, index * 100);
    });
  }

  downloadAll() {
    this.convertedFiles.forEach((fileData) => {
      if (fileData.convertedBlob) {
        const url = URL.createObjectURL(fileData.convertedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = this.getConvertedFileName(fileData.name);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });

    this.showNotification("All files downloaded successfully!", "success");
  }

  async downloadAsZip() {
    
    this.showNotification(
      'ZIP download feature coming soon! Use "Download All" for individual files.',
      "info"
    );
  }

  getConvertedFileName(originalName) {
    const nameWithoutExt = originalName.substring(
      0,
      originalName.lastIndexOf(".")
    );
    const extension = this.outputFormat === "jpeg" ? "jpg" : this.outputFormat;
    return `${nameWithoutExt}_converted.${extension}`;
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <i class="fas fa-${
              type === "success"
                ? "check-circle"
                : type === "error"
                ? "exclamation-triangle"
                : "info-circle"
            }"></i>
            ${message}
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  clearFiles() {
    this.files = [];
    this.convertedFiles = [];
    this.updateFileList();
    document.getElementById("convertButton").disabled = true;
    document.getElementById("progressBar").classList.add("hidden");
    document.getElementById("downloadSection").classList.add("hidden");
    document.getElementById("statistics").classList.add("hidden");
    document.getElementById("progressFill").style.width = "0%";
  }
}

class AnimationUtils {
  static createParticles() {
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.position = "fixed";
      particle.style.width = "4px";
      particle.style.height = "4px";
      particle.style.background = "rgba(255, 255, 255, 0.3)";
      particle.style.borderRadius = "50%";
      particle.style.pointerEvents = "none";
      particle.style.zIndex = "-1";

      particle.style.left = Math.random() * 100 + "vw";
      particle.style.top = Math.random() * 100 + "vh";

      particle.style.animation = `float ${
        3 + Math.random() * 4
      }s ease-in-out infinite`;
      particle.style.animationDelay = Math.random() * 5 + "s";

      document.body.appendChild(particle);
    }
  }

  static observeElements() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = "running";
        }
      });
    });

    document.querySelectorAll(".stat-item, .file-item").forEach((item) => {
      observer.observe(item);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  
  window.imageConverter = new ImageConverter();

  AnimationUtils.createParticles();

  AnimationUtils.observeElements();

  document.addEventListener("keydown", (e) => {
    
    if ((e.ctrlKey || e.metaKey) && e.key === "o") {
      e.preventDefault();
      document.getElementById("fileInput").click();
    }

    if (e.key === "Escape") {
      window.imageConverter.clearFiles();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      const convertButton = document.getElementById("convertButton");
      if (!convertButton.disabled) {
        convertButton.click();
      }
    }
  });

  const clearButton = document.createElement("button");
  clearButton.innerHTML = '<i class="fas fa-trash"></i> Clear All';
  clearButton.className = "clear-button";
  clearButton.style.cssText = `
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        margin: 10px;
        font-weight: 600;
        display: none;
        align-items: center;
        gap: 8px;
    `;

  clearButton.addEventListener("click", () => {
    window.imageConverter.clearFiles();
    clearButton.style.display = "none";
  });

  clearButton.addEventListener("mouseenter", () => {
    clearButton.style.transform = "translateY(-2px)";
    clearButton.style.boxShadow = "0 8px 16px rgba(231, 76, 60, 0.3)";
  });

  clearButton.addEventListener("mouseleave", () => {
    clearButton.style.transform = "translateY(0)";
    clearButton.style.boxShadow = "none";
  });

  document.querySelector(".download-section").appendChild(clearButton);

  const originalAddFiles = window.imageConverter.addFiles;
  window.imageConverter.addFiles = function (files) {
    originalAddFiles.call(this, files);
    if (this.files.length > 0) {
      clearButton.style.display = "inline-flex";
    }
  };

  if ("performance" in window) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const loadTime = performance.now();
        console.log(`ImageFlow loaded in ${loadTime.toFixed(2)}ms`);
      }, 0);
    });
  }
});

const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--glass-bg);
        backdrop-filter: blur(10px);
        border-radius: 10px;
        padding: 15px 20px;
        box-shadow: 0 10px 30px var(--shadow-color);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        font-weight: 600;
        z-index: 1001;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 300px;
    }

    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }

    .notification-success {
        border-left: 4px solid #28a745;
    }

    .notification-error {
        border-left: 4px solid #dc3545;
    }

    .notification-info {
        border-left: 4px solid #17a2b8;
    }

    .notification i {
        font-size: 1.2rem;
    }

    .notification-success i {
        color: #28a745;
    }

    .notification-error i {
        color: #dc3545;
    }

    .notification-info i {
        color: #17a2b8;
    }
`;

document.head.appendChild(notificationStyles);
