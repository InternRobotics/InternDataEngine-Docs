import DefaultTheme from 'vitepress/theme'
import './style.css'

export default {
  ...DefaultTheme,
  setup() {
    // Add drag-to-scroll for code blocks
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const codeBlocks = document.querySelectorAll('.vp-doc [class*="language-"]')
        codeBlocks.forEach(block => {
          let isDown = false
          let startX
          let scrollLeft

          block.style.cursor = 'grab'

          block.addEventListener('mousedown', (e) => {
            isDown = true
            block.style.cursor = 'grabbing'
            startX = e.pageX - block.offsetLeft
            scrollLeft = block.scrollLeft
          })

          block.addEventListener('mouseleave', () => {
            isDown = false
            block.style.cursor = 'grab'
          })

          block.addEventListener('mouseup', () => {
            isDown = false
            block.style.cursor = 'grab'
          })

          block.addEventListener('mousemove', (e) => {
            if (!isDown) return
            e.preventDefault()
            const x = e.pageX - block.offsetLeft
            const walk = (x - startX) * 1.5
            block.scrollLeft = scrollLeft - walk
          })
        })

        // Add click-to-zoom for images
        const images = document.querySelectorAll('.vp-doc img')
        images.forEach(img => {
          img.addEventListener('click', () => {
            // Create overlay
            const overlay = document.createElement('div')
            overlay.className = 'image-zoom-overlay'

            // Create zoomed image
            const zoomedImg = document.createElement('img')
            zoomedImg.src = img.src

            overlay.appendChild(zoomedImg)
            document.body.appendChild(overlay)

            // Close on click
            overlay.addEventListener('click', () => {
              document.body.removeChild(overlay)
            })

            // Close on escape key
            const handleEsc = (e) => {
              if (e.key === 'Escape') {
                if (document.body.contains(overlay)) {
                  document.body.removeChild(overlay)
                }
                document.removeEventListener('keydown', handleEsc)
              }
            }
            document.addEventListener('keydown', handleEsc)
          })
        })
      }, 500)
    }
  }
}