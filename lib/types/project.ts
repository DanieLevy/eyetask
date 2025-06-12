import { ObjectId } from 'mongodb';

export interface Project {
  _id?: ObjectId;
  name: string;
  description: string;
  isActive?: boolean;
  color?: string;
  priority?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDisplayItem extends Omit<Project, '_id'> {
  id: string;
  timeSinceCreated?: string;
  timeSinceUpdated?: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  isActive?: boolean;
  color?: string;
  priority?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  image?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  color?: string;
  priority?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  image?: string;
}

export type ProjectWithId = Project & { id: string }; 