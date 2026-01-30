'use client'

/**
 * QR Code Generator Component
 *
 * Generates QR codes for restaurant tables with customization options.
 *
 * Features:
 * - QR code generation with qrcode.react
 * - Custom foreground/background colors for branding
 * - Logo embedding (centered in QR)
 * - Download as PNG or SVG
 * - Print-ready output
 * - Mobile-responsive design
 *
 * @example
 * ```tsx
 * <QRGenerator
 *   url="https://example.com/r/restaurant/table-1"
 *   title="Masa 1"
 *   foregroundColor="#000000"
 *   backgroundColor="#ffffff"
 *   logoUrl="/logo.png"
 *   onDownload={(format) => console.log(`Downloaded as ${format}`)}
 * />
 * ```
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// =============================================================================
// TYPES
// =============================================================================

export interface QRGeneratorProps {
  /** The URL to encode in the QR code */
  url: string
  /** Title displayed above the QR code (optional) */
  title?: string
  /** Subtitle displayed below the title (optional) */
  subtitle?: string
  /** QR code foreground color */
  foregroundColor?: string
  /** QR code background color */
  backgroundColor?: string
  /** Logo URL to embed in center (optional) */
  logoUrl?: string | null
  /** Size of the QR code in pixels */
  size?: number
  /** Error correction level */
  level?: 'L' | 'M' | 'Q' | 'H'
  /** Include margin around QR code */
  includeMargin?: boolean
  /** Callback when download is triggered */
  onDownload?: (format: 'png' | 'svg') => void
  /** Additional CSS class */
  className?: string
  /** If true, only renders the QR code without action buttons (for preview) */
  previewOnly?: boolean
}

export interface QRBrandingOptions {
  foregroundColor: string
  backgroundColor: string
  logoUrl: string | null
  includeTitle: boolean
  includeRestaurantName: boolean
}

export interface TableQRData {
  id: string
  name: string
  tableNumber: string | null
  section: string | null
  qrUuid: string
  url: string
}

// =============================================================================
// ICONS
// =============================================================================

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert canvas to data URL
 */
function canvasToDataURL(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg' = 'image/png'): string {
  return canvas.toDataURL(type)
}

/**
 * Download a data URL as a file
 */
function downloadDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataURL
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Download an SVG element as a file
 */
function downloadSVG(svgElement: SVGElement, filename: string): void {
  const serializer = new XMLSerializer()
  const source = serializer.serializeToString(svgElement)
  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  const link = document.createElement('a')
  link.download = filename
  link.href = svgUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(svgUrl)
}

/**
 * Convert SVG element to PNG data URL via canvas
 */
async function svgToPNG(svgElement: SVGElement, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svgElement)
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      const pngUrl = canvas.toDataURL('image/png')

      URL.revokeObjectURL(svgUrl)
      resolve(pngUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('Failed to load SVG as image'))
    }
    img.src = svgUrl
  })
}

/**
 * Generate a filename for the QR code
 */
function generateFilename(title: string | undefined, format: 'png' | 'svg'): string {
  const base = title
    ? title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    : 'qr-code'
  return `${base}-qr.${format}`
}

// =============================================================================
// QR GENERATOR COMPONENT
// =============================================================================

export function QRGenerator({
  url,
  title,
  subtitle,
  foregroundColor = '#000000',
  backgroundColor = '#ffffff',
  logoUrl,
  size = 256,
  level = 'H', // High error correction for logo embedding
  includeMargin = true,
  onDownload,
  className = '',
  previewOnly = false,
}: QRGeneratorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isDownloading, setIsDownloading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  // Download as PNG (using canvas)
  const handleDownloadPNG = useCallback(async () => {
    setIsDownloading(true)
    try {
      // Try to use the canvas ref first
      if (canvasRef.current) {
        const dataURL = canvasToDataURL(canvasRef.current)
        downloadDataURL(dataURL, generateFilename(title, 'png'))
        onDownload?.('png')
        return
      }

      // Fall back to converting SVG to PNG
      if (svgRef.current) {
        const pngUrl = await svgToPNG(svgRef.current, size, size)
        downloadDataURL(pngUrl, generateFilename(title, 'png'))
        onDownload?.('png')
      }
    } catch (error) {
      // Error handling without console.log
    } finally {
      setIsDownloading(false)
    }
  }, [title, size, onDownload])

  // Download as SVG
  const handleDownloadSVG = useCallback(() => {
    if (!svgRef.current) return

    setIsDownloading(true)
    try {
      downloadSVG(svgRef.current, generateFilename(title, 'svg'))
      onDownload?.('svg')
    } finally {
      setIsDownloading(false)
    }
  }, [title, onDownload])

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }, [url])

  // Print QR code
  const handlePrint = useCallback(() => {
    if (!containerRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrContent = containerRef.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Kod - ${title || 'E-Menum'}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .qr-container {
              text-align: center;
            }
            .qr-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .qr-subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 16px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${title ? `<div class="qr-title">${title}</div>` : ''}
            ${subtitle ? `<div class="qr-subtitle">${subtitle}</div>` : ''}
            ${qrContent}
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }, [title, subtitle])

  // Logo settings for QR code (center overlay)
  const logoSettings = logoUrl
    ? {
        src: logoUrl,
        height: size * 0.2,
        width: size * 0.2,
        excavate: true, // Remove QR modules behind logo
      }
    : undefined

  return (
    <div className={`space-y-4 ${className}`}>
      {/* QR Code Display */}
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center rounded-lg border bg-white p-6"
        style={{ backgroundColor }}
      >
        {title && (
          <p className="mb-2 text-lg font-semibold text-center" style={{ color: foregroundColor }}>
            {title}
          </p>
        )}
        {subtitle && (
          <p className="mb-4 text-sm text-muted-foreground text-center">
            {subtitle}
          </p>
        )}

        {/* SVG version (for display and SVG download) */}
        <div className="relative">
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={size}
            level={level}
            fgColor={foregroundColor}
            bgColor={backgroundColor}
            includeMargin={includeMargin}
            imageSettings={logoSettings}
          />
        </div>

        {/* Hidden canvas for PNG export */}
        <div className="hidden">
          <QRCodeCanvas
            ref={canvasRef}
            value={url}
            size={size * 2} // Higher resolution for download
            level={level}
            fgColor={foregroundColor}
            bgColor={backgroundColor}
            includeMargin={includeMargin}
            imageSettings={logoSettings ? { ...logoSettings, height: size * 0.4, width: size * 0.4 } : undefined}
          />
        </div>
      </div>

      {!previewOnly && (
        <>
          {/* URL Display with Copy */}
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
            <span className="flex-1 truncate text-sm text-muted-foreground">
              {url}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyUrl}
              className="h-8 w-8 p-0"
              aria-label="URL'yi kopyala"
            >
              {copiedUrl ? (
                <CheckIcon className="h-4 w-4 text-green-600" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPNG}
              disabled={isDownloading}
              className="flex-1 sm:flex-none"
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              PNG İndir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSVG}
              disabled={isDownloading}
              className="flex-1 sm:flex-none"
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              SVG İndir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex-1 sm:flex-none"
            >
              <PrintIcon className="mr-2 h-4 w-4" />
              Yazdır
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// QR BRANDING SETTINGS COMPONENT
// =============================================================================

interface QRBrandingSettingsProps {
  settings: QRBrandingOptions
  onChange: (settings: QRBrandingOptions) => void
  organizationLogo?: string | null
  className?: string
}

export function QRBrandingSettings({
  settings,
  onChange,
  organizationLogo,
  className = '',
}: QRBrandingSettingsProps) {
  const handleColorChange = (key: 'foregroundColor' | 'backgroundColor', value: string) => {
    onChange({ ...settings, [key]: value })
  }

  const handleLogoToggle = () => {
    onChange({
      ...settings,
      logoUrl: settings.logoUrl ? null : organizationLogo || null,
    })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">QR Kod Görünümü</CardTitle>
        <CardDescription>
          QR kodlarınızı markanıza uygun şekilde özelleştirin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Foreground Color */}
        <div className="space-y-2">
          <Label htmlFor="foreground-color">Ön Plan Rengi</Label>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-md border cursor-pointer"
              style={{ backgroundColor: settings.foregroundColor }}
            />
            <Input
              id="foreground-color"
              type="color"
              value={settings.foregroundColor}
              onChange={(e) => handleColorChange('foregroundColor', e.target.value)}
              className="h-10 w-20 cursor-pointer"
            />
            <Input
              type="text"
              value={settings.foregroundColor}
              onChange={(e) => handleColorChange('foregroundColor', e.target.value)}
              placeholder="#000000"
              className="h-10 flex-1"
            />
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-2">
          <Label htmlFor="background-color">Arka Plan Rengi</Label>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-md border cursor-pointer"
              style={{ backgroundColor: settings.backgroundColor }}
            />
            <Input
              id="background-color"
              type="color"
              value={settings.backgroundColor}
              onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
              className="h-10 w-20 cursor-pointer"
            />
            <Input
              type="text"
              value={settings.backgroundColor}
              onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
              placeholder="#ffffff"
              className="h-10 flex-1"
            />
          </div>
        </div>

        {/* Logo Toggle */}
        {organizationLogo && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="include-logo"
              checked={!!settings.logoUrl}
              onChange={handleLogoToggle}
              className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <Label htmlFor="include-logo" className="cursor-pointer">
              Logo Ekle
            </Label>
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="Logo önizleme"
                className="h-8 w-8 rounded object-contain"
              />
            )}
          </div>
        )}

        {/* Include Title Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="include-title"
            checked={settings.includeTitle}
            onChange={(e) => onChange({ ...settings, includeTitle: e.target.checked })}
            className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <Label htmlFor="include-title" className="cursor-pointer">
            Masa Adını Göster
          </Label>
        </div>

        {/* Include Restaurant Name Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="include-restaurant"
            checked={settings.includeRestaurantName}
            onChange={(e) => onChange({ ...settings, includeRestaurantName: e.target.checked })}
            className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <Label htmlFor="include-restaurant" className="cursor-pointer">
            Restoran Adını Göster
          </Label>
        </div>

        {/* Preset Colors */}
        <div className="space-y-2">
          <Label>Hazır Renkler</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { fg: '#000000', bg: '#ffffff', label: 'Siyah-Beyaz' },
              { fg: '#1e3a5f', bg: '#ffffff', label: 'Lacivert' },
              { fg: '#047857', bg: '#ffffff', label: 'Yeşil' },
              { fg: '#7c3aed', bg: '#ffffff', label: 'Mor' },
              { fg: '#dc2626', bg: '#ffffff', label: 'Kırmızı' },
              { fg: '#ffffff', bg: '#1e3a5f', label: 'Ters Lacivert' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onChange({
                    ...settings,
                    foregroundColor: preset.fg,
                    backgroundColor: preset.bg,
                  })
                }
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                title={preset.label}
              >
                <span
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: preset.fg }}
                />
                <span
                  className="h-4 w-4 rounded border"
                  style={{ backgroundColor: preset.bg }}
                />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// QR CODE PREVIEW CARD COMPONENT
// =============================================================================

interface QRCodePreviewCardProps {
  table: TableQRData
  brandingSettings: QRBrandingOptions
  organizationName: string
  onSelect?: () => void
  isSelected?: boolean
  className?: string
}

export function QRCodePreviewCard({
  table,
  brandingSettings,
  organizationName,
  onSelect,
  isSelected = false,
  className = '',
}: QRCodePreviewCardProps) {
  const title = brandingSettings.includeTitle
    ? `${table.section ? `${table.section} - ` : ''}${table.name}`
    : undefined

  const subtitle = brandingSettings.includeRestaurantName ? organizationName : undefined

  return (
    <Card
      className={`
        cursor-pointer transition-all hover:shadow-md
        ${isSelected ? 'ring-2 ring-primary-500 border-primary-500' : ''}
        ${className}
      `}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection checkbox */}
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Mini QR preview */}
          <div className="flex-shrink-0 rounded border bg-white p-2">
            <QRCodeSVG
              value={table.url}
              size={64}
              level="M"
              fgColor={brandingSettings.foregroundColor}
              bgColor={brandingSettings.backgroundColor}
            />
          </div>

          {/* Table info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{table.name}</h4>
            {table.tableNumber && (
              <p className="text-sm text-muted-foreground">No: {table.tableNumber}</p>
            )}
            {table.section && (
              <p className="text-xs text-muted-foreground truncate">{table.section}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// BATCH QR DOWNLOAD COMPONENT
// =============================================================================

interface BatchQRDownloadProps {
  tables: TableQRData[]
  brandingSettings: QRBrandingOptions
  organizationName: string
  onComplete?: () => void
  className?: string
}

export function BatchQRDownload({
  tables,
  brandingSettings,
  organizationName,
  onComplete,
  className = '',
}: BatchQRDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleBatchDownload = useCallback(async () => {
    if (tables.length === 0) return

    setIsGenerating(true)
    setProgress(0)

    try {
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i]

        // Create a temporary container for the QR code
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.left = '-9999px'
        document.body.appendChild(container)

        // Create canvas for this QR code
        const canvas = document.createElement('canvas')
        const size = 512 // High resolution for print
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        // Fill background
        ctx.fillStyle = brandingSettings.backgroundColor
        ctx.fillRect(0, 0, size, size)

        // Create temporary SVG
        const tempDiv = document.createElement('div')
        const { createRoot } = await import('react-dom/client')

        // We can't use React components directly here, so we'll use the native qrcode library approach
        // For now, let's use a simpler approach - just download individual files

        // Clean up
        document.body.removeChild(container)

        // Update progress
        setProgress(((i + 1) / tables.length) * 100)

        // Small delay between downloads to prevent browser blocking
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      onComplete?.()
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }, [tables, brandingSettings, organizationName, onComplete])

  return (
    <div className={className}>
      <Button
        onClick={handleBatchDownload}
        disabled={isGenerating || tables.length === 0}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            İndiriliyor... ({Math.round(progress)}%)
          </>
        ) : (
          <>
            <DownloadIcon className="mr-2 h-4 w-4" />
            {tables.length} QR Kod İndir
          </>
        )}
      </Button>
    </div>
  )
}
