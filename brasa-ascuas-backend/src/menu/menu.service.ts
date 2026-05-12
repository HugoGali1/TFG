import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  // --- Categories ---

  async createCategory(dto: CreateCategoryDto): Promise<CategoryDocument> {
    return new this.categoryModel(dto).save();
  }

  async findAllCategories(): Promise<CategoryDocument[]> {
    return this.categoryModel.find({ isActive: true }).sort({ order: 1 }).exec();
  }

  async removeCategory(id: string): Promise<void> {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Categoría no encontrada');
  }

  // --- Menu Items ---

  async createItem(dto: CreateMenuItemDto): Promise<MenuItemDocument> {
    return new this.menuItemModel(dto).save();
  }

  async findAllItems(filters?: {
    categoryId?: string;
    isVegetarian?: boolean;
    isGlutenFree?: boolean;
    isSpicy?: boolean;
    search?: string;
  }): Promise<MenuItemDocument[]> {
    const query: Record<string, unknown> = { isAvailable: true };

    if (filters?.categoryId) query.category = filters.categoryId;
    if (filters?.isVegetarian) query.isVegetarian = true;
    if (filters?.isGlutenFree) query.isGlutenFree = true;
    if (filters?.isSpicy) query.isSpicy = true;
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return this.menuItemModel
      .find(query)
      .populate('category')
      .sort({ orderCount: -1 })
      .exec();
  }

  async findItemById(id: string): Promise<MenuItemDocument> {
    const item = await this.menuItemModel.findById(id).populate('category').exec();
    if (!item) throw new NotFoundException('Plato no encontrado');
    return item;
  }

  async updateItem(id: string, dto: Partial<CreateMenuItemDto>): Promise<MenuItemDocument> {
    const item = await this.menuItemModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('category')
      .exec();
    if (!item) throw new NotFoundException('Plato no encontrado');
    return item;
  }

  async toggleAvailability(id: string): Promise<MenuItemDocument> {
    const item = await this.menuItemModel.findById(id).exec();
    if (!item) throw new NotFoundException('Plato no encontrado');
    item.isAvailable = !item.isAvailable;
    return item.save();
  }

  async removeItem(id: string): Promise<void> {
    const result = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Plato no encontrado');
  }
}
