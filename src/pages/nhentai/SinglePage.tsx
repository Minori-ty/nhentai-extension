import { runConcurrently } from '../../utils/runConcurrently'
import './SinglePage.css'

/**
 * 单图模式页面的主入口类
 */
export class SinglePage {
    /**
     * 初始化单图模式
     */
    public static init(): void {
        if (window.location.search.includes('single=true')) {
            this.handleSingleMode()
        } else {
            this.addSingleImageButton()
        }
    }

    /**
     * 解析HTML字符串
     * @param html HTML字符串
     */
    private static parseHTML(html: string): Document {
        const parser = new DOMParser()
        return parser.parseFromString(html, 'text/html')
    }

    /**
     * 创建占位盒子
     * @param pageNum 页码
     * @param totalPages 总页数
     * @returns 包含占位盒子的包装器元素
     */
    private static createPlaceholder(pageNum: number, totalPages: number): HTMLDivElement {
        const imgWrapper = document.createElement('div')
        imgWrapper.className = 'single-image-wrapper'
        imgWrapper.id = `image-wrapper-${pageNum}`

        const pageNumDiv = document.createElement('div')
        pageNumDiv.className = 'page-number'
        pageNumDiv.textContent = `${pageNum} / ${totalPages}`
        imgWrapper.appendChild(pageNumDiv)

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
    private static async loadImage(galleryId: string, pageNum: number, totalPages: number): Promise<void> {
        const imgWrapper = document.getElementById(`image-wrapper-${pageNum}`)
        if (!imgWrapper) return

        return new Promise(async (resolve, reject) => {
            try {
                console.log('开始加载HTML', pageNum)
                const response = await fetch(`/g/${galleryId}/${pageNum}/`)
                const html = await response.text()
                console.log('HTML加载完成', pageNum)

                const doc = this.parseHTML(html)
                const imageContainer = doc.querySelector('#image-container img')

                if (!imageContainer) {
                    throw new Error('找不到图片元素')
                }

                const img = document.createElement('img')
                img.src = imageContainer.getAttribute('src') || ''
                img.className = 'single-mode-image'
                img.style.display = 'none'

                img.onload = () => {
                    const placeholder = imgWrapper.querySelector('.image-placeholder')
                    if (placeholder) {
                        placeholder.remove()
                    }
                    img.style.display = 'block'
                    console.log('图片加载完成', pageNum)
                    resolve()
                }

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
    private static async fetchAndInsertImages(galleryId: string, totalPages: number, startPage: number) {
        const container = document.createElement('div')
        container.className = 'single-mode-container'
        document.body.appendChild(container)

        const loadingTip = document.createElement('div')
        loadingTip.className = 'loading-tip'
        loadingTip.textContent = '加载中...'
        container.appendChild(loadingTip)

        try {
            for (let i = startPage; i <= totalPages; i++) {
                const imgWrapper = this.createPlaceholder(i, totalPages)
                container.appendChild(imgWrapper)
            }

            const loadTasks = Array.from({ length: totalPages - startPage + 1 }, (_, index) => {
                const pageNum = startPage + index
                return () =>
                    this.loadImage(galleryId, pageNum, totalPages).then(() => {
                        loadingTip.textContent = `加载中... ${pageNum}/${totalPages}`
                        return pageNum
                    })
            })

            await runConcurrently(loadTasks, 6)
        } finally {
            loadingTip.remove()
        }
    }

    /**
     * 处理单图模式
     */
    private static handleSingleMode(): void {
        const numPagesElement = document.querySelector('.num-pages')
        if (!numPagesElement) return

        const totalPages = parseInt(numPagesElement.textContent || '0', 10)
        console.log('总页数:', totalPages)

        const pathSegments = window.location.pathname.split('/')
        const galleryId = pathSegments[2]
        const startPage = parseInt(pathSegments[3], 10) || 1
        console.log('起始页码:', startPage)

        const contentElement = document.querySelector('#content')
        if (contentElement) {
            contentElement.remove()
        }

        this.fetchAndInsertImages(galleryId, totalPages, startPage)
    }

    /**
     * 添加单图模式按钮
     */
    private static addSingleImageButton(): void {
        const favoriteBtn = document.querySelector('#favorite')
        if (!favoriteBtn) return

        const singleImageBtn = document.createElement('button')
        singleImageBtn.className = 'btn btn-primary'
        singleImageBtn.style.marginLeft = '10px'
        singleImageBtn.innerHTML = `
            <i class="fas fa-image"></i>
            <span class="text">单图模式</span>
        `

        singleImageBtn.addEventListener('click', () => {
            const currentUrl = new URL(window.location.href)
            const pathSegments = currentUrl.pathname.split('/')
            const newPath = `${pathSegments[1]}/${pathSegments[2]}/1/`
            window.location.href = `${currentUrl.origin}/${newPath}?single=true`
        })

        favoriteBtn.parentNode?.insertBefore(singleImageBtn, favoriteBtn.nextSibling)
    }
}
