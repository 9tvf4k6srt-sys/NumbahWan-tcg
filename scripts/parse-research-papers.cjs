/**
 * Research Papers Parser
 * Parses the 500 research papers file and creates:
 * 1. papers-index.json - Metadata for all papers (titles, categories, keywords)
 * 2. Individual paper JSON files for lazy loading
 */

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '../data/research-papers-source.txt');
const OUTPUT_DIR = path.join(__dirname, '../public/static/research-data');
const INDEX_FILE = path.join(OUTPUT_DIR, 'papers-index.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read source file
console.log('Reading source file...');
const content = fs.readFileSync(SOURCE_FILE, 'utf-8');

// Split by paper boundary
const papers = content.split('###PAPER_BOUNDARY###').filter(p => p.includes('PAPER_ID:'));

console.log(`Found ${papers.length} papers`);

const paperIndex = {
    totalPapers: 0,
    categories: {},
    papers: []
};

papers.forEach((paperText, idx) => {
    try {
        // Extract metadata
        const idMatch = paperText.match(/PAPER_ID:\s*(\d+)/);
        const titleMatch = paperText.match(/TOPIC_TITLE:\s*(.+)/);
        const categoryMatch = paperText.match(/CATEGORY:\s*(.+)/);
        const keywordsMatch = paperText.match(/KEYWORDS:\s*(.+)/);
        
        if (!idMatch || !titleMatch) {
            console.log(`Skipping invalid paper at index ${idx}`);
            return;
        }
        
        const paperId = parseInt(idMatch[1]);
        const title = titleMatch[1].trim();
        const category = categoryMatch ? categoryMatch[1].trim() : 'Uncategorized';
        const keywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : [];
        
        // Extract abstract for preview
        const abstractMatch = paperText.match(/## ABSTRACT\s*\n+([\s\S]*?)(?=\n## INTRODUCTION|\n## |$)/i);
        const abstract = abstractMatch ? abstractMatch[1].trim().substring(0, 500) + '...' : '';
        
        // Extract full content
        const contentMatch = paperText.match(/PAPER_CONTENT:\s*[-]+\s*([\s\S]*?)(?=\n-+\nREFERENCES:|$)/);
        const fullContent = contentMatch ? contentMatch[1].trim() : '';
        
        // Extract references
        const refsMatch = paperText.match(/REFERENCES:\s*[-]+\s*([\s\S]*?)(?=###PAPER_BOUNDARY|$)/);
        const references = refsMatch ? refsMatch[1].trim() : '';
        
        // Add to index
        const paperMeta = {
            id: paperId,
            title: title,
            category: category,
            keywords: keywords,
            abstract: abstract,
            wordCount: fullContent.split(/\s+/).length
        };
        
        paperIndex.papers.push(paperMeta);
        
        // Track categories
        if (!paperIndex.categories[category]) {
            paperIndex.categories[category] = 0;
        }
        paperIndex.categories[category]++;
        
        // Save individual paper file
        const paperData = {
            id: paperId,
            title: title,
            category: category,
            keywords: keywords,
            content: fullContent,
            references: references
        };
        
        const paperFile = path.join(OUTPUT_DIR, `paper-${paperId}.json`);
        fs.writeFileSync(paperFile, JSON.stringify(paperData, null, 2));
        
        if (paperId % 50 === 0) {
            console.log(`Processed paper ${paperId}...`);
        }
        
    } catch (err) {
        console.error(`Error processing paper at index ${idx}:`, err.message);
    }
});

paperIndex.totalPapers = paperIndex.papers.length;

// Sort papers by ID
paperIndex.papers.sort((a, b) => a.id - b.id);

// Save index
fs.writeFileSync(INDEX_FILE, JSON.stringify(paperIndex, null, 2));

console.log(`\nDone! Created:`);
console.log(`- Index file with ${paperIndex.totalPapers} papers`);
console.log(`- ${Object.keys(paperIndex.categories).length} categories`);
console.log(`- Individual paper JSON files in ${OUTPUT_DIR}`);
