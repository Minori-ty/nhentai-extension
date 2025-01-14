import './InfiniteScroll.css'

/**
 * 无限滚动类
 */
export class InfiniteScroll {
    /** 是否正在加载中 */
    private static isLoading = false
    /** 当前页码 */
    private static currentPage = 1
    /** 总页数 */
    private static totalPages = Infinity
    /** 基础URL */
    private static baseUrl = ''
    /** 搜索参数 */
    private static searchParams: URLSearchParams | null = null
    /** 节流定时器 */
    private static throttleTimer: number | null = null
    /** 节流延迟时间(ms) */
    private static readonly THROTTLE_DELAY = 200
    /** 重试次数 */
    private static readonly MAX_RETRIES = 3
    /** 重试延迟(ms) */
    private static readonly RETRY_DELAY = 1000
    /** 滚动触发阈值 */
    private static readonly SCROLL_THRESHOLD = 80
    /** 页码指示器元素 */
    private static pageIndicator: HTMLDivElement | null = null

    /**
     * 初始化无限滚动
     */
    public static init(): void {
        this.setupInitialState()
        this.addScrollListener()
        this.addBackToTopButton()
        this.addPageIndicator()
    }

    /**
     * 设置初始状态
     */
    private static setupInitialState(): void {
        const url = new URL(window.location.href)
        this.searchParams = url.searchParams

        // 从URL中获取当前页码
        const pageParam = url.searchParams.get('page')
        this.currentPage = pageParam ? parseInt(pageParam, 10) : 1

        // 设置基础URL
        if (url.pathname === '/') {
            this.baseUrl = '/'
        } else if (url.pathname === '/favorites/') {
            this.baseUrl = '/favorites/'
        } else if (url.pathname === '/search/') {
            this.baseUrl = '/search/'
        } else if (url.pathname.startsWith('/tags/')) {
            this.baseUrl = url.pathname
        }

        // 获取总页数
        const pagination = document.querySelector('.pagination')
        if (pagination) {
            this.totalPages = this.getTotalPagesFromPagination(pagination)
            console.log('总页数:', this.totalPages)
            // 移除初始的分页器
            pagination.remove()
        }

        // 处理当前页面的图片
        const container = this.getTargetContainer()
        if (container) {
            this.handleLazyImages(container, this.currentPage)
        }
    }

    /**
     * 从分页器中获取总页数
     * @param pagination 分页器元素
     * @returns 总页数
     */
    private static getTotalPagesFromPagination(pagination: Element): number {
        const lastPageLink = pagination.querySelector('.last')
        if (lastPageLink) {
            const href = lastPageLink.getAttribute('href')
            if (href) {
                const match = href.match(/page=(\d+)/)
                if (match) {
                    return parseInt(match[1], 10)
                }
            }
        }
        // 如果找不到last链接，尝试找最后一个页码
        const pageLinks = pagination.querySelectorAll('.page')
        if (pageLinks.length > 0) {
            const lastPage = pageLinks[pageLinks.length - 1].textContent
            if (lastPage) {
                return parseInt(lastPage, 10)
            }
        }
        return 1
    }

    /**
     * 添加返回顶部按钮
     */
    private static addBackToTopButton(): void {
        const button = document.createElement('div')
        button.className = 'back-to-top'
        button.innerHTML = '<i class="fa fa-arrow-up"></i>'
        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        })

        document.body.appendChild(button)

        // 控制按钮显示/隐藏
        window.addEventListener(
            'scroll',
            this.throttle(() => {
                if (window.scrollY > window.innerHeight) {
                    button.classList.add('visible')
                } else {
                    button.classList.remove('visible')
                }
            })
        )
    }

    /**
     * 添加滚动监听器
     */
    private static addScrollListener(): void {
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this)))
    }

    /**
     * 节流函数
     * @param callback 需要节流的回调函数
     * @returns 节流后的函数
     */
    private static throttle(callback: () => void): () => void {
        return () => {
            if (this.throttleTimer !== null) {
                return
            }

            this.throttleTimer = window.setTimeout(() => {
                callback()
                this.throttleTimer = null
            }, this.THROTTLE_DELAY)
        }
    }

    /**
     * 添加页码指示器
     */
    private static addPageIndicator(): void {
        this.pageIndicator = document.createElement('div')
        this.pageIndicator.className = 'page-indicator'
        this.updatePageIndicator(this.currentPage) // 使用当前页码而不是固定的1
        document.body.appendChild(this.pageIndicator)
    }

    /**
     * 更新页码指示器
     * @param currentViewPage 当前查看的页码
     */
    private static updatePageIndicator(currentViewPage: number): void {
        if (!this.pageIndicator) return
        this.pageIndicator.textContent = `${currentViewPage} / ${this.totalPages}页`
    }

    /**
     * 处理滚动事件
     */
    private static handleScroll(): void {
        // 获取当前视口中的页码
        const container = this.getTargetContainer()
        if (container) {
            let currentViewPage = this.currentPage

            // 获取所有图片
            const allImages = document.querySelectorAll('img.lazyload')
            const containerImages = container.querySelectorAll('img.lazyload')

            // 先检查顶部的图片是否属于容器
            for (const img of allImages) {
                const rect = img.getBoundingClientRect()
                if (rect.top <= window.innerHeight / 2 && rect.bottom >= 0) {
                    // 检查这个图片是否属于容器
                    if (container.contains(img)) {
                        const pageNum = img.getAttribute('data-page')
                        if (pageNum) {
                            currentViewPage = parseInt(pageNum, 10)
                            break
                        }
                    } else {
                        // 如果顶部图片不属于容器，查找视口内的容器图片
                        for (const containerImg of containerImages) {
                            const containerImgRect = containerImg.getBoundingClientRect()
                            if (containerImgRect.top <= window.innerHeight && containerImgRect.bottom >= 0) {
                                const pageNum = containerImg.getAttribute('data-page')
                                if (pageNum) {
                                    currentViewPage = parseInt(pageNum, 10)
                                    break
                                }
                            }
                        }
                    }
                    break
                }
            }

            this.updatePageIndicator(currentViewPage)
        }

        // 如果正在加载或已经到达最后一页，不触发加载
        if (this.isLoading || this.currentPage >= this.totalPages) {
            return
        }

        const scrollPosition = window.scrollY + window.innerHeight
        const totalHeight = document.documentElement.scrollHeight
        const scrollPercentage = (scrollPosition / totalHeight) * 100

        if (scrollPercentage > this.SCROLL_THRESHOLD) {
            this.loadNextPage()
        }
    }

    /**
     * 获取正确的容器元素
     * @returns 正确的容器元素，如果找不到则返回null
     */
    private static getTargetContainer(): Element | null {
        // 如果是收藏页面，使用 favcontainer
        if (window.location.pathname === '/favorites/') {
            return document.getElementById('favcontainer')
        }

        // 其他页面使用原来的逻辑
        const containers = document.querySelectorAll('.container.index-container')
        const container = Array.from(containers).find((container) => !container.classList.contains('index-popular'))
        return container || null
    }

    /**
     * 添加加载提示元素
     */
    private static addLoadingIndicator(): HTMLDivElement {
        const loadingDiv = document.createElement('div')
        loadingDiv.className = 'infinite-scroll-loading'

        // 创建加载动画
        const spinner = document.createElement('div')
        spinner.className = 'loading-spinner'
        loadingDiv.appendChild(spinner)

        // 创建文本
        const text = document.createElement('span')
        text.textContent = '加载中...'
        loadingDiv.appendChild(text)

        const container = this.getTargetContainer()
        if (!container) {
            throw new Error('找不到目标容器元素')
        }

        container.appendChild(loadingDiv)
        return loadingDiv
    }

    /**
     * 添加到达底部提示
     */
    private static addEndIndicator(): void {
        // 如果已经有底部提示，则不重复添加
        if (document.querySelector('.infinite-scroll-end')) {
            return
        }

        const endDiv = document.createElement('div')
        endDiv.className = 'infinite-scroll-end'
        endDiv.textContent = '- 已经没有了 -'

        const container = this.getTargetContainer()
        if (!container) {
            throw new Error('找不到目标容器元素')
        }

        container.appendChild(endDiv)
    }

    /**
     * 处理懒加载图片
     * @param container 包含懒加载图片的容器
     * @param pageNum 当前页码
     */
    private static handleLazyImages(container: Element | DocumentFragment, pageNum: number): void {
        const lazyImages = container.querySelectorAll('img.lazyload')
        lazyImages.forEach((img) => {
            if (img instanceof HTMLImageElement) {
                const dataSrc = img.getAttribute('data-src')
                if (dataSrc) {
                    img.src = dataSrc
                    img.removeAttribute('data-src')
                    // 添加页码属性
                    img.setAttribute('data-page', pageNum.toString())
                }
            }
        })
    }

    /**
     * 从新页面中获取正确的容器
     * @param doc 解析后的HTML文档
     * @returns 正确的容器元素，如果找不到则返回null
     */
    private static getNewPageContainer(doc: Document): Element | null {
        // 如果是收藏页面，使用 favcontainer
        if (window.location.pathname === '/favorites/') {
            return doc.getElementById('favcontainer')
        }

        // 其他页面使用原来的逻辑
        const containers = doc.querySelectorAll('.container.index-container')
        return Array.from(containers).find((container) => !container.classList.contains('index-popular')) || null
    }

    /**
     * 加载下一页
     * @param retryCount 重试次数
     */
    private static async loadNextPage(retryCount = 0): Promise<void> {
        const loadingIndicator = this.addLoadingIndicator()

        try {
            this.isLoading = true
            const nextPage = this.currentPage + 1

            // 移除当前页面的分页器
            const currentPagination = document.querySelector('.pagination')
            currentPagination?.remove()

            if (nextPage > this.totalPages) {
                this.addEndIndicator()
                loadingIndicator.remove()
                return
            }

            // 构建并请求下一页
            const params = new URLSearchParams(this.searchParams || '')
            params.set('page', nextPage.toString())
            const nextPageUrl = `${window.location.origin}${this.baseUrl}?${params.toString()}`

            const response = await fetch(nextPageUrl)
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

            const html = await response.text()
            const doc = this.parseHTML(html)

            // 从新页面中获取正确的容器
            const newContainer = this.getNewPageContainer(doc)
            const currentContainer = this.getTargetContainer()

            if (!newContainer || !currentContainer) {
                throw new Error('找不到容器元素')
            }

            // 使用文档片段优化性能
            const fragment = document.createDocumentFragment()
            Array.from(newContainer.children).forEach((child) => {
                // 跳过分页器
                if (!child.classList.contains('pagination')) {
                    fragment.appendChild(child)
                }
            })

            // 处理懒加载图片，传入页码
            this.handleLazyImages(fragment, nextPage)

            currentContainer.appendChild(fragment)
            this.currentPage = nextPage
            this.updatePageIndicator(this.currentPage)

            // 如果是最后一页，添加底部提示
            if (this.currentPage >= this.totalPages) {
                this.addEndIndicator()
            }
        } catch (error) {
            console.error('加载下一页失败:', error)
            // 移除原有内容
            loadingIndicator.innerHTML = ''

            // 添加错误文本
            const errorText = document.createElement('span')
            errorText.textContent = '加载失败，正在重试...'
            loadingIndicator.appendChild(errorText)

            if (retryCount < this.MAX_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY))
                return this.loadNextPage(retryCount + 1)
            }

            // 移除原有内容
            loadingIndicator.innerHTML = ''

            // 添加错误文本
            const finalErrorText = document.createElement('span')
            finalErrorText.textContent = `加载失败: ${error instanceof Error ? error.message : String(error)}`
            loadingIndicator.appendChild(finalErrorText)

            setTimeout(() => loadingIndicator.remove(), 3000)
        } finally {
            this.isLoading = false
            loadingIndicator.remove()
        }
    }

    /**
     * 解析HTML
     */
    private static parseHTML(html: string): Document {
        const parser = new DOMParser()
        return parser.parseFromString(html, 'text/html')
    }

    /**
     * 清理资源
     */
    public static destroy(): void {
        // 清除节流定时器
        if (this.throttleTimer !== null) {
            clearTimeout(this.throttleTimer)
            this.throttleTimer = null
        }
        // 移除滚动监听器
        window.removeEventListener('scroll', this.handleScroll)
        // 移除返回顶部按钮
        document.querySelector('.back-to-top')?.remove()
        // 移除页码指示器
        this.pageIndicator?.remove()
    }
}
