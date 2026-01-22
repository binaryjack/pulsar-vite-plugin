/**
 * Build Optimizer
 * Main orchestrator for build optimizations
 */

import * as ts from 'typescript';
import { foldConstants, type IFoldingResult } from './optimizers/constant-folder';
import { eliminateDeadCode, type IEliminationResult } from './optimizers/dead-code-eliminator';
import { logReport, type IOptimizationReport } from './reporters/optimization-reporter';
import { generateBundleSizeReport, type IBundleSizeReport, type ISizeWarning } from './warnings/bundle-size-warner';

export interface IOptimizerConfig {
    constantFolding?: boolean;
    deadCodeElimination?: boolean;
    bundleWarnings?: boolean;
    bundleSizeThreshold?: number; // bytes
    verbose?: boolean;
    reportFormat?: 'full' | 'minimal' | 'json';
}

const DEFAULT_CONFIG: Required<IOptimizerConfig> = {
    constantFolding: true,
    deadCodeElimination: true,
    bundleWarnings: true,
    bundleSizeThreshold: 100000, // 100KB
    verbose: false,
    reportFormat: 'minimal'
};

/**
 * Main optimization function
 */
export function optimize(
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker,
    context: ts.TransformationContext,
    config: IOptimizerConfig = {}
): { sourceFile: ts.SourceFile; report: IOptimizationReport } {
    const startTime = Date.now();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    let currentSourceFile = sourceFile;
    let constantFolding: IFoldingResult | undefined;
    let deadCodeElimination: IEliminationResult | undefined;
    let bundleSize: IBundleSizeReport | undefined;
    const warnings: ISizeWarning[] = [];
    let totalBytesSaved = 0;
    let optimizationsApplied = 0;

    // Phase 1: Constant Folding
    if (finalConfig.constantFolding) {
        const result = foldConstants(currentSourceFile, typeChecker, context);
        currentSourceFile = result.sourceFile;
        constantFolding = result.result;
        totalBytesSaved += constantFolding.bytesReduced;
        optimizationsApplied += constantFolding.foldedCount;
    }

    // Phase 2: Dead Code Elimination
    if (finalConfig.deadCodeElimination) {
        const result = eliminateDeadCode(currentSourceFile, typeChecker, context);
        currentSourceFile = result.sourceFile;
        deadCodeElimination = result.result;
        totalBytesSaved += deadCodeElimination.bytesRemoved;
        optimizationsApplied += deadCodeElimination.removedCount;
    }

    // Phase 3: Bundle Analysis & Warnings
    if (finalConfig.bundleWarnings) {
        bundleSize = generateBundleSizeReport(currentSourceFile, finalConfig.bundleSizeThreshold);
        warnings.push(...bundleSize.warnings);
    }

    const duration = Date.now() - startTime;

    const report: IOptimizationReport = {
        timestamp: Date.now(),
        duration,
        constantFolding,
        deadCodeElimination,
        bundleSize,
        totalBytesSaved,
        optimizationsApplied,
        warnings
    };

    // Log report if verbose
    if (finalConfig.verbose) {
        logReport(report, true);
    }

    return {
        sourceFile: currentSourceFile,
        report
    };
}

/**
 * Creates a TypeScript custom transformer
 */
export function createOptimizerTransformer(
    program: ts.Program,
    config: IOptimizerConfig = {}
): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            const typeChecker = program.getTypeChecker();
            const result = optimize(sourceFile, typeChecker, context, config);
            return result.sourceFile;
        };
    };
}

/**
 * Optimizes a single file
 */
export function optimizeFile(
    filePath: string,
    program: ts.Program,
    config: IOptimizerConfig = {}
): IOptimizationReport | null {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
        console.error(`File not found: ${filePath}`);
        return null;
    }

    const typeChecker = program.getTypeChecker();
    const transformationContext: ts.TransformationContext = {
        getCompilerOptions: () => program.getCompilerOptions(),
        factory: ts.factory,
        getEmitResolver: () => undefined as any,
        hoistFunctionDeclaration: () => {},
        hoistVariableDeclaration: () => {},
        requestEmitHelper: () => {},
        readEmitHelpers: () => undefined,
        enableEmitNotification: () => {},
        enableSubstitution: () => {},
        isEmitNotificationEnabled: () => false,
        isSubstitutionEnabled: () => false,
        onEmitNode: () => {},
        onSubstituteNode: (hint, node) => node,
        startLexicalEnvironment: () => {},
        suspendLexicalEnvironment: () => {},
        resumeLexicalEnvironment: () => {},
        endLexicalEnvironment: () => undefined
    } as ts.TransformationContext;

    const result = optimize(sourceFile, typeChecker, transformationContext, config);
    return result.report;
}

/**
 * Batch optimization for multiple files
 */
export function optimizeProgram(
    program: ts.Program,
    config: IOptimizerConfig = {}
): IOptimizationReport[] {
    const reports: IOptimizationReport[] = [];

    for (const sourceFile of program.getSourceFiles()) {
        // Skip declaration files and node_modules
        if (sourceFile.isDeclarationFile || sourceFile.fileName.includes('node_modules')) {
            continue;
        }

        const report = optimizeFile(sourceFile.fileName, program, config);
        if (report) {
            reports.push(report);
        }
    }

    return reports;
}

/**
 * Aggregates multiple reports into a summary
 */
export function aggregateReports(reports: IOptimizationReport[]): IOptimizationReport {
    const totalBytesSaved = reports.reduce((sum, r) => sum + r.totalBytesSaved, 0);
    const optimizationsApplied = reports.reduce((sum, r) => sum + r.optimizationsApplied, 0);
    const warnings = reports.flatMap(r => r.warnings);
    const totalDuration = reports.reduce((sum, r) => sum + r.duration, 0);

    return {
        timestamp: Date.now(),
        duration: totalDuration,
        totalBytesSaved,
        optimizationsApplied,
        warnings
    };
}

// Export types
export type { IBundleSizeReport, IEliminationResult, IFoldingResult, IOptimizationReport, ISizeWarning };

