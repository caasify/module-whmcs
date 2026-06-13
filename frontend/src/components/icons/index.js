import { createElement, forwardRef } from 'react'
import { createAnimatedIcon } from './createAnimatedIcon'
import { CirclePlus, Code2, Hash, Image, Landmark, List, MoreVertical, Network, Pilcrow, Printer, Server as LucideServer, Square } from 'lucide-react'
import { cn } from '@/lib/cn'

import { ActivityIcon } from './animated/activity'
import { BadgeAlertIcon } from './animated/badge-alert'
import { DownloadIcon } from './animated/download'
import { ArrowLeftIcon } from './animated/arrow-left'
import { ArrowRightIcon } from './animated/arrow-right'
import { ArrowUpRightIcon } from './animated/arrow-up-right'
import { BoldIcon } from './animated/bold'
import { BriefcaseBusinessIcon } from './animated/briefcase-business'
import { CalendarDaysIcon } from './animated/calendar-days'
import { CheckIcon } from './animated/check'
import { CircleCheckIcon } from './animated/circle-check'
import { CircleHelpIcon } from './animated/circle-help'
import { ChevronDownIcon } from './animated/chevron-down'
import { ChevronLeftIcon } from './animated/chevron-left'
import { ChevronRightIcon } from './animated/chevron-right'
import { ChevronsUpDownIcon } from './animated/chevrons-up-down'
import { CopyIcon } from './animated/copy'
import { CpuIcon } from './animated/cpu'
import { CreditCardIcon } from './animated/credit-card'
import { DatabaseBackupIcon } from './animated/database-backup'
import { Disc3Icon } from './animated/disc-3'
import { EyeIcon } from './animated/eye'
import { EyeOffIcon } from './animated/eye-off'
import { FileTextIcon } from './animated/file-text'
import { HardDriveDownloadIcon } from './animated/hard-drive-download'
import { ItalicIcon } from './animated/italic'
import { LayoutGridIcon } from './animated/layout-grid'
import { LinkIcon } from './animated/link'
import { LogoutIcon } from './animated/logout'
import { MapPinIcon } from './animated/map-pin'
import { MessageSquareIcon } from './animated/message-square'
import { MessageSquarePlusIcon } from './animated/message-square-plus'
import { Maximize2Icon } from './animated/maximize-2'
import { MenuIcon } from './animated/menu'
import { MoonIcon } from './animated/moon'
import { PlayIcon } from './animated/play'
import { PlusIcon } from './animated/plus'
import { ReceiptIcon } from './animated/receipt'
import { ReceiptTextIcon } from './animated/receipt-text'
import { RefreshCWIcon } from './animated/refresh-cw'
import { SearchIcon } from './animated/search'
import { SlidersHorizontalIcon } from './animated/sliders-horizontal'
import { SunMediumIcon } from './animated/sun-medium'
import { TerminalIcon } from './animated/terminal'
import { TrendingUpIcon } from './animated/trending-up'
import { WalletIcon } from './animated/wallet'
import { XIcon } from './animated/x'
import { ZapIcon } from './animated/zap'

export const Activity = createAnimatedIcon(ActivityIcon, 'Activity')
export const AlertTriangle = createAnimatedIcon(BadgeAlertIcon, 'AlertTriangle')
export const ArrowDownToLine = createAnimatedIcon(DownloadIcon, 'ArrowDownToLine')
export const ArrowLeft = createAnimatedIcon(ArrowLeftIcon, 'ArrowLeft')
export const ArrowRight = createAnimatedIcon(ArrowRightIcon, 'ArrowRight')
export const ArrowUpRight = createAnimatedIcon(ArrowUpRightIcon, 'ArrowUpRight')
export const Bold = createAnimatedIcon(BoldIcon, 'Bold')
export const BriefcaseBusiness = createAnimatedIcon(BriefcaseBusinessIcon, 'BriefcaseBusiness')
export const CalendarDays = createAnimatedIcon(CalendarDaysIcon, 'CalendarDays')
export const Check = createAnimatedIcon(CheckIcon, 'Check')
export const CheckCircle2 = createAnimatedIcon(CircleCheckIcon, 'CheckCircle2')
export const ChevronDown = createAnimatedIcon(ChevronDownIcon, 'ChevronDown')
export const ChevronLeft = createAnimatedIcon(ChevronLeftIcon, 'ChevronLeft')
export const ChevronRight = createAnimatedIcon(ChevronRightIcon, 'ChevronRight')
export const ChevronsUpDown = createAnimatedIcon(ChevronsUpDownIcon, 'ChevronsUpDown')
export const Copy = createAnimatedIcon(CopyIcon, 'Copy')
export const Cpu = createAnimatedIcon(CpuIcon, 'Cpu')
export const CreditCard = createAnimatedIcon(CreditCardIcon, 'CreditCard')
export const Database = createAnimatedIcon(DatabaseBackupIcon, 'Database')
export const Disc3 = createAnimatedIcon(Disc3Icon, 'Disc3')
export const Download = createAnimatedIcon(DownloadIcon, 'Download')
export const Eye = createAnimatedIcon(EyeIcon, 'Eye')
export const EyeOff = createAnimatedIcon(EyeOffIcon, 'EyeOff')
export const FileText = createAnimatedIcon(FileTextIcon, 'FileText')
export const HardDrive = createAnimatedIcon(HardDriveDownloadIcon, 'HardDrive')
export const Headset = createAnimatedIcon(MessageSquarePlusIcon, 'Headset')
export const Info = createAnimatedIcon(CircleHelpIcon, 'Info')
export const Italic = createAnimatedIcon(ItalicIcon, 'Italic')
export const LayoutGrid = createAnimatedIcon(LayoutGridIcon, 'LayoutGrid')
export const Link2 = createAnimatedIcon(LinkIcon, 'Link2')
export const LogOut = createAnimatedIcon(LogoutIcon, 'LogOut')
export const MapPin = createAnimatedIcon(MapPinIcon, 'MapPin')
export const Maximize2 = createAnimatedIcon(Maximize2Icon, 'Maximize2')
export const Menu = createAnimatedIcon(MenuIcon, 'Menu')
export const Moon = createAnimatedIcon(MoonIcon, 'Moon')
export const Play = createAnimatedIcon(PlayIcon, 'Play')
export const Plus = createAnimatedIcon(PlusIcon, 'Plus')
export const Receipt = createAnimatedIcon(ReceiptIcon, 'Receipt')
export const ReceiptText = createAnimatedIcon(ReceiptTextIcon, 'ReceiptText')
export const RefreshCw = createAnimatedIcon(RefreshCWIcon, 'RefreshCw')
export const Search = createAnimatedIcon(SearchIcon, 'Search')
export const Server = forwardRef(function Server(
  { className, size = 24, strokeWidth = 2, ...props },
  ref,
) {
  return createElement(LucideServer, {
    ref,
    className: cn('inline-flex items-center justify-center align-middle', className),
    size,
    strokeWidth,
    ...props,
  })
})
Server.displayName = 'Server'
export const SlidersHorizontal = createAnimatedIcon(SlidersHorizontalIcon, 'SlidersHorizontal')
export const SunMedium = createAnimatedIcon(SunMediumIcon, 'SunMedium')
export const Terminal = createAnimatedIcon(TerminalIcon, 'Terminal')
export const Ticket = createAnimatedIcon(MessageSquareIcon, 'Ticket')
export const TrendingUp = createAnimatedIcon(TrendingUpIcon, 'TrendingUp')
export const Wallet = createAnimatedIcon(WalletIcon, 'Wallet')
export const WalletCards = createAnimatedIcon(WalletIcon, 'WalletCards')
export const X = createAnimatedIcon(XIcon, 'X')
export const Zap = createAnimatedIcon(ZapIcon, 'Zap')
export { CirclePlus, Code2, Hash, Image, Landmark, List, MoreVertical, Network, Pilcrow, Printer, Square }
