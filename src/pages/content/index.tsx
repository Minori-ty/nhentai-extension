import { createRoot } from 'react-dom/client'
import './style.css'

/**
 * 解析HTML字符串
 * @param html HTML字符串
 */
function parseHTML(html: string): Document {
    const parser = new DOMParser()
    return parser.parseFromString(html, 'text/html')
}

/**
 * 获取所有图片并插入到页面
 * @param galleryId 画廊ID
 * @param totalPages 总页数
 */
async function fetchAndInsertImages(galleryId: string, totalPages: number) {
    // 创建容器
    const container = document.createElement('div')
    container.className = 'single-mode-container'
    document.body.appendChild(container)

    // 创建加载提示
    const loadingTip = document.createElement('div')
    loadingTip.className = 'loading-tip'
    loadingTip.textContent = '加载中...'
    container.appendChild(loadingTip)

    try {
        // 循环请求每一页
        for (let i = 1; i <= totalPages; i++) {
            const response = await fetch(`/g/${galleryId}/${i}/`)
            const html = await response.text()
            const doc = parseHTML(html)

            // 查找图片元素
            const imageContainer = doc.querySelector('#image-container img')
            if (imageContainer) {
                const imgWrapper = document.createElement('div')
                imgWrapper.className = 'single-image-wrapper'

                // 添加页码提示
                const pageNum = document.createElement('div')
                pageNum.className = 'page-number'
                pageNum.textContent = `${i} / ${totalPages}`
                imgWrapper.appendChild(pageNum)

                // 添加图片
                const img = document.createElement('img')
                img.src = imageContainer.getAttribute('src') || ''
                img.className = 'single-mode-image'
                imgWrapper.appendChild(img)

                container.appendChild(imgWrapper)
            }

            // 更新加载进度
            loadingTip.textContent = `加载中... ${i}/${totalPages}`
        }
    } finally {
        // 移除加载提示
        loadingTip.remove()
    }
}

/**
 * 处理单图模式
 */
function handleSingleMode() {
    // 检查是否是单图模式
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('single') === 'true') {
        // 获取总页数
        const numPagesElement = document.querySelector('.num-pages')
        if (!numPagesElement) return

        const totalPages = parseInt(numPagesElement.textContent || '0', 10)
        console.log('总页数:', totalPages)

        // 获取画廊ID
        const pathSegments = window.location.pathname.split('/')
        const galleryId = pathSegments[2]

        // 移除content内容
        const contentElement = document.querySelector('#content')
        if (contentElement) {
            contentElement.remove()
        }

        // 开始获取和插入图片
        fetchAndInsertImages(galleryId, totalPages)
    }
}

/**
 * 添加单图模式按钮
 */
function addSingleImageButton() {
    // 查找原始的favorite按钮
    const favoriteBtn = document.querySelector('#favorite')
    if (!favoriteBtn) return

    // 创建单图模式按钮
    const singleImageBtn = document.createElement('button')
    singleImageBtn.className = 'btn btn-primary'
    singleImageBtn.style.marginLeft = '10px'
    singleImageBtn.innerHTML = `
        <i class="fas fa-image"></i>
        <span class="text">单图模式</span>
    `

    // 添加点击事件
    singleImageBtn.addEventListener('click', () => {
        // 获取当前URL
        const currentUrl = new URL(window.location.href)
        // 构建新的URL路径
        const pathSegments = currentUrl.pathname.split('/')
        const newPath = `${pathSegments[1]}/${pathSegments[2]}/1/`
        // 跳转到新URL
        window.location.href = `${currentUrl.origin}/${newPath}?single=true`
    })

    // 将按钮插入到favorite按钮后面
    favoriteBtn.parentNode?.insertBefore(singleImageBtn, favoriteBtn.nextSibling)
}

try {
    // 等待DOM加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addSingleImageButton()
            handleSingleMode()
        })
    } else {
        addSingleImageButton()
        handleSingleMode()
    }
    console.log('content script loaded')
} catch (e) {
    console.error(e)
}
