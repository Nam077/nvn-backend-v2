import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CategoriesService } from '../src/modules/categories/categories.service';

async function findCategoryName() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categoriesService = app.get(CategoriesService);

  const categoryId = 'b42585b6-816e-4d40-addc-603a98cc41b3';

  try {
    console.log(`Searching for category with ID: ${categoryId}...`);
    const category = await categoriesService.findOne(categoryId);
    console.log('--- Found Category ---');
    console.log(`ID: ${category.id}`);
    console.log(`Name: ${category.name}`);
    console.log(`Slug: ${category.slug}`);
    console.log('----------------------');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error finding category:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  } finally {
    await app.close();
  }
}

findCategoryName(); 