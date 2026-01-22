/**
 * Optimization Reporter
 * Reports optimization results and statistics
 */

import type { IFoldingResult } from '../optimizers/constant-folder';
import type { IEliminationResult } from '../optimizers/dead-code-eliminator';
import type { IBundleSizeReport, ISizeWarning } from '../warnings/bundle-size-warner';

export interface IOptimizationReport {
    timestamp: number;
    duration: number;
    constantFolding?: IFoldingResult;
    deadCodeElimination?: IEliminationResult;
    bundleSize?: IBundleSizeReport;
    totalBytesSaved: number;
    optimizationsApplied: number;
    warnings: ISizeWarning[];
}

/**
 * Formats an optimization report for console output
 */
export function formatReport(report: IOptimizationReport): string {
    const lines: string[] = [];
    
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('  BUILD OPTIMIZATION REPORT');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    // Summary
    lines.push(`⏱️  Duration: ${report.duration}ms`);
    lines.push(`💾 Bytes Saved: ${formatBytes(report.totalBytesSaved)}`);
    lines.push(`✅ Optimizations: ${report.optimizationsApplied}`);
    lines.push('');

    // Constant Folding
    if (report.constantFolding && report.constantFolding.foldedCount > 0) {
        lines.push('📦 Constant Folding:');
        lines.push(`   • Folded: ${report.constantFolding.foldedCount} expressions`);
        lines.push(`   • Saved: ${formatBytes(report.constantFolding.bytesReduced)}`);
        lines.push('');
    }

    // Dead Code Elimination
    if (report.deadCodeElimination && report.deadCodeElimination.removedCount > 0) {
        lines.push('🗑️  Dead Code Elimination:');
        lines.push(`   • Removed: ${report.deadCodeElimination.removedCount} items`);
        lines.push(`   • Saved: ${formatBytes(report.deadCodeElimination.bytesRemoved)}`);
        
        if (report.deadCodeElimination.removedItems.length > 0) {
            const byType = groupBy(report.deadCodeElimination.removedItems, 'type');
            for (const [type, items] of Object.entries(byType)) {
                lines.push(`   • ${type}: ${items.length} removed`);
            }
        }
        lines.push('');
    }

    // Bundle Size
    if (report.bundleSize) {
        lines.push('📊 Bundle Analysis:');
        lines.push(`   • Total Size: ${formatBytes(report.bundleSize.totalSize)}`);
        lines.push(`   • Code Size: ${formatBytes(report.bundleSize.codeSize)}`);
        lines.push(`   • Import Size: ${formatBytes(report.bundleSize.importSize)}`);
        
        if (report.bundleSize.largestImports.length > 0) {
            lines.push('   • Largest Imports:');
            for (const imp of report.bundleSize.largestImports) {
                lines.push(`     - ${imp.name}: ${formatBytes(imp.size)}`);
            }
        }
        lines.push('');
    }

    // Warnings
    if (report.warnings.length > 0) {
        lines.push('⚠️  Warnings:');
        for (const warning of report.warnings) {
            lines.push(`   • ${warning.type}: ${warning.message}`);
            if (warning.suggestion) {
                lines.push(`     💡 ${warning.suggestion}`);
            }
        }
        lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    return lines.join('\n');
}

/**
 * Creates a minimal report (for CI/build logs)
 */
export function formatMinimalReport(report: IOptimizationReport): string {
    const parts: string[] = [];
    
    parts.push(`Optimizations: ${report.optimizationsApplied}`);
    parts.push(`Saved: ${formatBytes(report.totalBytesSaved)}`);
    parts.push(`Time: ${report.duration}ms`);
    
    if (report.warnings.length > 0) {
        parts.push(`Warnings: ${report.warnings.length}`);
    }
    
    return parts.join(' | ');
}

/**
 * Exports report as JSON
 */
export function exportReportJSON(report: IOptimizationReport): string {
    return JSON.stringify(report, null, 2);
}

/**
 * Formats bytes to human-readable format
 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Groups array items by a key
 */
function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
    return items.reduce((acc, item) => {
        const group = String(item[key]);
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}

/**
 * Compares two reports to show improvement
 */
export function compareReports(
    before: IOptimizationReport,
    after: IOptimizationReport
): string {
    const lines: string[] = [];
    
    lines.push('');
    lines.push('📈 OPTIMIZATION COMPARISON');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const bytesDiff = after.totalBytesSaved - before.totalBytesSaved;
    const percentChange = ((bytesDiff / before.totalBytesSaved) * 100).toFixed(1);
    
    lines.push(`Bytes Saved: ${formatBytes(before.totalBytesSaved)} → ${formatBytes(after.totalBytesSaved)}`);
    lines.push(`Change: ${bytesDiff > 0 ? '+' : ''}${formatBytes(bytesDiff)} (${percentChange}%)`);
    
    lines.push('');
    return lines.join('\n');
}

/**
 * Logs report to console with colors (if supported)
 */
export function logReport(report: IOptimizationReport, verbose: boolean = false): void {
    if (verbose) {
        console.log(formatReport(report));
    } else {
        console.log(formatMinimalReport(report));
    }
}
