/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import _ from 'lodash';

import { faker } from '@faker-js/faker';

// --- CONFIGURATION ---
const CONFIG = {
    API_BASE_URL: 'http://localhost:3011/api',
    // !!! IMPORTANT: Replace with a valid JWT token for an authenticated user !!!
    AUTH_TOKEN:
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjBmNzFkY2JlLTEwZTgtNDM4NS05YmEzLTE4MWM2Y2FhNzc0MyJ9.eyJzdWIiOiIwNDUxNDE3OC1mZTRmLTQ1ZDQtOGM5YS02NmFlZDA5YTg0MGIiLCJlbWFpbCI6InN5c2FkbWluQG52bi5jb20iLCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiMmE5YzVmMmMtY2FmMS00NDQ4LTlmOWUtODRhNWU1NmZjNGI0Iiwic2lkIjoiZTBmZTEwN2EtMjBiZS00MDJlLWE2Y2QtNzRlOTFhYjRjODQ3IiwiaWF0IjoxNzUyMzMwMDYzLCJleHAiOjE3NTI0MTY0NjMsImF1ZCI6Im52bi11c2VycyIsImlzcyI6Im52bi1iYWNrZW5kIn0.F3X9Ux07ukuPlo6dIc9s1BryE7mIjYsTGmBMX_r9QUkpcY963HSIr3KuMAcaUH4sALkUNeU3f3KTkZ41IrcDsg84BgK-i4l1PWFY3qTfFfU9-a5nzvZAQrAXe6yspjozWCpKjwNIq6SZsFijAIsCUAa4Wf57xztr97k1WTY5Uoog60_IIuEA0F5rfXld-5oFCj5jaqqGTFlo1-MOHeAmhkRO_u4NImRvkrLN7SZ4liV1DwTAnxP3cCaJ9VEWAaMmIkHpReiDb69h870mAd4CgPlWVTJzJTJ1b-a6Td_611Q643juPGB9ee_Y8ZG4BuN8krvqMhJqRm_OR4rdyryDDQ',
    TOTAL_FONTS: 100_000,
    BATCH_SIZE: 1000,
    CREATOR_ID: '8859db1c-54e8-4624-9661-50fa8a10abd5', // Default creator ID
    // Use the category IDs you provided
    CATEGORY_IDS: [
        '6e9246ff-62dd-4856-90c8-60d2109d1a65',
        '6d905904-6355-43f9-a6e0-8430c6d3391a',
        '8c019173-a926-4c5b-b858-f35e2ee6b4dd',
        '2c0f8200-d4e2-4547-b400-4fb396517091',
        '8eeac571-1248-4598-9dac-066d3489beea',
        'aedbaac7-be50-458f-a590-fafc1b312b3d',
        '8f70ee89-340f-4423-89d3-5780eef17373',
        'f72d267e-6763-4246-b549-b38362651faa',
        '9d52309d-35d2-4ba4-a697-739b09e6da30',
        '5f181695-b194-4876-a7d0-cf87ba970220',
        '5c91860a-bbf6-4ab5-bf35-e137bf37ad2a',
        '9b001cdb-c6d5-45df-86ef-d9da8e596766',
        '8b079f20-29d2-49ca-a719-4a286927d65f',
        '550a07a7-558b-4bc9-90de-6b63eb573a66',
        '08ace51f-d9d9-4d69-bdb6-3ee63623acd1',
        '28df48cc-23e1-4a13-9460-e7d085568686',
        'cef7891e-bcad-476d-920b-b84e591d7540',
        'cf99411f-a567-4147-912a-e62a0d0a927d',
        '0b7f19b0-87ed-40c8-a44c-386b14b8a5ca',
        'ae096f5d-9c23-4ee0-bf8e-bc308f7b12b2',
        '4472776c-70d9-4e75-ab98-7891d48c2fee',
        'b8799f5f-dbe2-4419-8457-9ec7e11a5dd5',
    ],
};

const BATCH_SIZE = 1000;
const TOTAL_FONTS = 100000;
const CONCURRENT_LIMIT = 5; // Number of parallel requests

const fetchRequiredIds = async () => {
    try {
        // In a real scenario, you'd fetch these from your API
        // For this script, we'll use static IDs.
        // Make sure these IDs exist in your database.
        const user = { id: '4be795cd-4322-4845-a9dc-f99e371331de' }; // Static user ID
        const file = { id: '0a5392d8-7559-4556-912b-2cf0150d1822' }; // Static file ID

        // You can dynamically fetch category and tag IDs here if needed
        const categories = [
            '5bd6a767-4dde-4bfc-af2d-a197f0bb5e82',
            '4b8b4503-5ba5-4462-b89a-dd91a563931b',
            '37afcf23-8f44-4277-9307-d88e1d2476fc',
            'd6a9ac5e-9cd7-4fdb-aa61-d2ad7fa20c57',
            '4c6170f0-1bdc-4217-adf7-cd3a629810a1',
            '0af7d0d8-4b57-428c-9f2b-e07a926f4a91',
            'e3cfc28b-b871-4568-a09c-da1887a3237d',
            'de0e5660-de53-4ac3-ba5c-c2811c4a7cdd',
            'f57253e2-d900-497b-9c1d-358d9e2f5de3',
            '15b80fc4-0112-481a-84fe-daf6f02862bc',
            '62216556-c727-485b-aa18-ddf2f5fd9c6e',
            '89d787a2-ba36-4ed1-8bfe-ce1257d2dd58',
            'da9a6f8e-6a2b-4600-9259-f100c60c370c',
            '8897de77-b307-4e5f-9049-8d72e8629838',
            'cb4744cc-859e-4b40-9c9c-bdc1a62b5ffa',
            '3c171662-9a70-4896-a0ee-b385dcf698c2',
            '1c7a2fc7-6806-4db6-a3aa-371cf9daa831',
            '87cad9cb-c046-4c66-a1cf-608175a0bf59',
            '756cdba8-7840-41a6-8efd-879da5414604',
            'b8eb8010-107a-4745-857d-592f0db893fb',
            'a298cbe0-04ae-4527-8e30-f1eb466af93e',
            'ffaa5d23-4e3f-40ec-b224-4ec76867df28',
        ];

        console.log(chalk.yellow('📝 Using static IDs for user, file, and tags.'));
        return {
            user,
            file,
            categoryIds: categories,
            tags: Array.from({ length: 50 }, () => faker.lorem.word()),
        };
    } catch (error) {
        console.error(chalk.bgRed.bold('Failed to fetch required IDs:'), error);
        process.exit(1);
    }
};

const createFakeFont = (userId, fileId, categoryIds, tags) => ({
    name: faker.lorem.words({ min: 2, max: 4 }),
    authors: [{ name: faker.person.fullName(), url: faker.internet.url() }],
    thumbnailUrl: faker.image.urlLoremFlickr({ category: 'abstract' }),
    description: faker.lorem.paragraph(),
    galleryImages: [
        {
            url: faker.image.urlLoremFlickr({ category: 'nature' }),
            order: 1,
            type: 'url',
        },
        {
            url: faker.image.urlLoremFlickr({ category: 'technology' }),
            order: 2,
            type: 'url',
        },
    ],
    creatorId: userId,
    fontType: faker.helpers.arrayElement(['free', 'vip', 'paid']),
    price: faker.commerce.price({ min: 0, max: 200, dec: 2 }),
    isActive: true,
    isSupportVietnamese: faker.datatype.boolean(),
    metadata: {
        version: faker.system.semver(),
        foundry: faker.company.name(),
    },
    categoryIds: _.sampleSize(categoryIds, faker.number.int({ min: 1, max: 3 })),
    tags: _.sampleSize(tags, faker.number.int({ min: 1, max: 2 })),
    previewText: 'The quick brown fox jumps over the lazy dog.',
    // thumbnailFileId: fileId,
});

const seedFonts = async () => {
    try {
        const { user, file, categoryIds, tags } = await fetchRequiredIds();

        console.log(chalk.blue('Generating mock font data...'));
        const allFonts = Array.from({ length: TOTAL_FONTS }, () => createFakeFont(user.id, file.id, categoryIds, tags));
        const fontBatches = _.chunk(allFonts, BATCH_SIZE);
        console.log(chalk.blue(`Starting font seeding: ${TOTAL_FONTS} fonts in ${fontBatches.length} batches.`));

        let createdCount = 0;
        const totalBatches = fontBatches.length;

        for (const [batchIndex, batch] of fontBatches.entries()) {
            const payload = { items: batch };
            try {
                const startTime = Date.now();
                await axios.post(`${CONFIG.API_BASE_URL}/fonts/bulk`, payload, {
                    headers: {
                        Authorization: `Bearer ${CONFIG.AUTH_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });
                const endTime = Date.now();
                createdCount += batch.length;
                console.log(
                    chalk.green(
                        `  [OK] Batch ${
                            batchIndex + 1
                        }/${totalBatches} seeded. Total: ${createdCount}/${TOTAL_FONTS}. Time: ${
                            endTime - startTime
                        }ms`,
                    ),
                );
            } catch (error: any) {
                const message = error.response?.data?.message || error.message || 'Unknown error';
                const fullError = JSON.stringify(error.response?.data, null, 2);
                console.error(
                    chalk.red(`  [FAIL] Batch ${batchIndex + 1}/${totalBatches} failed: ${message}\n${fullError}`),
                );
            }
        }

        console.log(chalk.bgGreen.bold('Seeding completed!'));
    } catch (error) {
        console.error(chalk.bgRed.bold('An unexpected error occurred during seeding setup:'), error);
        process.exit(1);
    }
};

seedFonts();
