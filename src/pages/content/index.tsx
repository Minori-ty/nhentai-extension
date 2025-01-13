import { runConcurrently } from '../../utils/runConcurrently'
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
 * 创建占位盒子
 * @param pageNum 页码
 * @param totalPages 总页数
 * @returns 包含占位盒子的包装器元素
 */
function createPlaceholder(pageNum: number, totalPages: number): HTMLDivElement {
    // 创建图片包装器
    const imgWrapper = document.createElement('div')
    imgWrapper.className = 'single-image-wrapper'
    imgWrapper.id = `image-wrapper-${pageNum}`

    // 添加页码提示
    const pageNumDiv = document.createElement('div')
    pageNumDiv.className = 'page-number'
    pageNumDiv.textContent = `${pageNum} / ${totalPages}`
    imgWrapper.appendChild(pageNumDiv)

    // 添加占位盒子
    const placeholder = document.createElement('div')
    placeholder.className = 'image-placeholder'
    imgWrapper.appendChild(placeholder)

    return imgWrapper
}

/**
 * 加载单张图片
 * @param galleryId 画廊ID
 * @param pageNum 页码
 * @param totalPages 总页数
 * @returns Promise，在图片加载完成时resolve
 */
async function loadImage(galleryId: string, pageNum: number, totalPages: number): Promise<void> {
    const imgWrapper = document.getElementById(`image-wrapper-${pageNum}`)
    if (!imgWrapper) return

    return new Promise(async (resolve, reject) => {
        try {
            // 获取图片页面
            console.log('开始加载HTML', pageNum)
            const response = await fetch(`/g/${galleryId}/${pageNum}/`)
            const html = await response.text()
            console.log('HTML加载完成', pageNum)

            const doc = parseHTML(html)
            const imageContainer = doc.querySelector('#image-container img')

            if (!imageContainer) {
                throw new Error('找不到图片元素')
            }

            const img = document.createElement('img')
            img.src = imageContainer.getAttribute('src') || ''
            img.className = 'single-mode-image'
            img.style.display = 'none' // 初始隐藏图片

            // 图片加载完成后替换占位盒子
            img.onload = () => {
                const placeholder = imgWrapper.querySelector('.image-placeholder')
                if (placeholder) {
                    placeholder.remove()
                }
                img.style.display = 'block'
                console.log('图片加载完成', pageNum)
                resolve()
            }

            // 图片加载失败时reject
            img.onerror = () => {
                reject(new Error(`图片加载失败: ${pageNum}`))
            }

            imgWrapper.appendChild(img)
        } catch (error) {
            console.error(`加载第 ${pageNum} 页时出错:`, error)
            const placeholder = imgWrapper.querySelector('.image-placeholder')
            if (placeholder) {
                placeholder.textContent = `加载失败: ${error instanceof Error ? error.message : String(error)}`
            }
            reject(error)
        }
    })
}

/**
 * 获取所有图片并插入到页面
 * @param galleryId 画廊ID
 * @param totalPages 总页数
 * @param startPage 起始页码
 */
async function fetchAndInsertImages(galleryId: string, totalPages: number, startPage: number) {
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
        // 先创建所有占位盒子
        for (let i = startPage; i <= totalPages; i++) {
            const imgWrapper = createPlaceholder(i, totalPages)
            container.appendChild(imgWrapper)
        }

        // 创建所有图片加载任务函数
        const loadTasks = Array.from({ length: totalPages - startPage + 1 }, (_, index) => {
            const pageNum = startPage + index
            return () =>
                loadImage(galleryId, pageNum, totalPages).then(() => {
                    loadingTip.textContent = `加载中... ${pageNum}/${totalPages}`
                    return pageNum
                })
        })

        // 使用并发控制函数，限制最多同时加载6张图片
        await runConcurrently(loadTasks, 6)
    } finally {
        // 所有图片加载完成后移除加载提示
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

        // 获取画廊ID和当前页码
        const pathSegments = window.location.pathname.split('/')
        const galleryId = pathSegments[2]
        /**
         * 从URL路径中获取起始页码
         * 例如：/g/549553/startPage/
         */
        const startPage = parseInt(pathSegments[3], 10) || 1
        console.log('起始页码:', startPage)

        // 移除content内容
        const contentElement = document.querySelector('#content')
        if (contentElement) {
            contentElement.remove()
        }

        // 开始获取和插入图片
        fetchAndInsertImages(galleryId, totalPages, startPage)
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
