// src/app/connect-family/connect-family.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timer } from 'rxjs';
import { CommonModule } from '@angular/common';

interface FamilyMember {
  id: string;
  username: string;
  unread?: number;
}

interface ChatMessage {
  sender: string;
  message: string;
  createdAt: Date;
}
interface User {
  userId: string;
  username: string;
  isAlzheimer: boolean;
}

@Component({
  selector: 'app-connect-family',
  templateUrl: './connectfamily.html',
  styleUrls: ['./connectfamily.css'],
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  standalone: true,
})
export class ConnectFamilyComponent implements OnInit {
  showChatPanel = false;
  searchTerm = '';
  memories: any[] = [];

  ngOnInit(): void {
    this.fetchCurrentUser();
    this.fetchFamilyMembers();
    this.fetchMemories(); // Fetch memories from backend
    this.pollMessages();
  }

  fetchCurrentUser() {
    this.http.get<User>('/api/user/current').subscribe((res) => {
      this.user = res;

      // After user is loaded, fetch family and memories
      this.fetchFamilyMembers();
      this.fetchMemories();
    });
  }

  fetchMemories() {
    if (!this.user) return; // make sure user is loaded
    const patientId = this.user?.userId;
    this.http.get<any[]>(`/api/memories/user/${patientId}`).subscribe((res) => {
      this.memories = res;
    });
  }

  filteredMemories() {
    if (!this.searchTerm) return this.memories;
    return this.memories.filter(
      (m) =>
        m.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (m.customCategory && m.customCategory.toLowerCase().includes(this.searchTerm.toLowerCase()))
    );
  }
  toggleChatPanel() {
    this.showChatPanel = !this.showChatPanel;
  }

  user: User | null = null; // Will be set from backend
  form: FormGroup;
  familyMembers: FamilyMember[] = [];
  chats: { [key: string]: ChatMessage[] } = {};
  selectedMember: FamilyMember | null = null;
  newMessage = '';
  showChatModal = false;
  toastVisible = false;
  toastMessage = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({ username: [''] });
  }

  addFamilyMember() {
    const username = this.form.value.username;
    if (!username) return;
    this.http.post('/api/family/connect', { username }).subscribe(() => {
      this.toast('Family member connected!');
      this.form.reset();
      this.fetchFamilyMembers();
    });
  }

  fetchFamilyMembers() {
    this.http.get<FamilyMember[]>('/api/family/list').subscribe((res) => {
      this.familyMembers = res.map((member) => ({ ...member, unread: 0 }));
      res.forEach((m) => (this.chats[m.username] = []));
    });
  }

  openChat(member: FamilyMember) {
    this.selectedMember = member;
    this.showChatModal = true;
    // reset unread count
    member.unread = 0;
  }

  closeChat() {
    this.showChatModal = false;
    this.selectedMember = null;
  }

  sendMessage() {
    if (!this.selectedMember || !this.newMessage.trim() || !this.user) return;
    const message = this.newMessage.trim();
    this.http
      .post('/api/chat/send', { to: this.selectedMember.username, message })
      .subscribe(() => {
        this.chats[this.selectedMember!.username].push({
          sender: this.user?.username!,
          message,
          createdAt: new Date(),
        });
        this.newMessage = '';
      });
  }

  pollMessages() {
    timer(0, 5000).subscribe(() => {
      this.http.get<ChatMessage[]>('/api/chat/receive').subscribe((res) => {
        res.forEach((msg) => {
          if (!this.chats[msg.sender]) this.chats[msg.sender] = [];
          const exists = this.chats[msg.sender].some(
            (m) => m.createdAt.toString() === msg.createdAt.toString()
          );
          if (!exists) {
            this.chats[msg.sender].push(msg);
            const member = this.familyMembers.find((m) => m.username === msg.sender);
            if (
              member &&
              (!this.selectedMember || this.selectedMember.username !== member.username)
            ) {
              member.unread = (member.unread || 0) + 1;
              this.toast(`New message from ${member.username}`);
            }
          }
        });
      });
    });
  }

  toast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 3000);
  }
}
