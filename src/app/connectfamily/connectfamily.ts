import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timer, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

// Interfaces for our data structures
interface FamilyMember {
  id: string;
  username: string;
  unread?: number;
}

interface ChatMessage {
  fromUser: string;
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
  // Component State
  pollingSub?: Subscription;

  showChatPanel = false;
  memories: any[] = [];
  user: User | null = null;
  form: FormGroup;
  familyMembers: FamilyMember[] = [];
  chats: { [key: string]: ChatMessage[] } = {};
  selectedMember: FamilyMember | null = null;
  newMessage = '';
  showConfirmDialog = false;
  confirmedMemoryId = '';
  page = 0;
  size = 8;
  totalPages = 1;
  selectedMemory: any = null; // For viewing a memory

  constructor(private fb: FormBuilder, private http: HttpClient, private toastr: ToastrService) {
    this.form = this.fb.group({ username: [''] });
  }

  ngOnInit(): void {
    this.fetchCurrentUser();

    // Start message polling ONCE
    if (!this.pollingSub) {
      this.startPollingMessages();
    }
  }
  ngOnDestroy(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  fetchCurrentUser() {
    const userId = localStorage.getItem('pma-userId');
    if (!userId) {
      // If user logged out, reset component state
      this.user = null;
      this.familyMembers = [];
      this.chats = {};
      this.selectedMember = null;
      this.showChatPanel = false;
      return;
    }

    this.http.get<User>(`http://localhost:8080/api/user/${userId}`).subscribe((res) => {
      this.user = res;
      this.fetchFamilyMembers();
      if (res.isAlzheimer) {
        this.loadMemories(res.userId);
      }
    });
  }

  fetchFamilyMembers() {
    if (!this.user) return;
    const headers = { 'X-Username': this.user.username };

    this.http
      .get<FamilyMember[]>('http://localhost:8080/api/family/list', { headers })
      .subscribe((res) => {
        this.familyMembers = res.map((member) => ({ ...member, unread: 0 }));
        res.forEach((m) => {
          if (!this.chats[m.username]) this.chats[m.username] = [];
        });
      });
  }

  selectMemberAndOpenChat(member: FamilyMember) {
    this.selectedMember = member;
    // **MEMORY VISIBILITY FIX**: If the logged-in user is NOT the patient,
    // load the memories of the PATIENT they just clicked on.
    if (this.user && !this.user.isAlzheimer) {
      this.loadMemories(member.id); // 'member.id' is the patient's userId
    }
    this.openChat(member);
  }

  loadMemories(userId: string) {
    this.http
      .get<any>(
        `http://localhost:8080/api/memories/user/${userId}?page=${this.page}&size=${this.size}`
      )
      .subscribe((res: any) => {
        this.memories = res.content || [];
        this.totalPages = res.totalPages || 1;
      });
  }

  addFamilyMember() {
    const username = this.form.value.username;
    if (!username) {
      this.toastr.warning('Please enter a username.');
      return;
    }
    if (!this.user?.isAlzheimer) {
      this.toastr.warning('Only patients can add family members.');
      return;
    }

    const headers = { 'X-Username': this.user.username };

    this.http
      .post('http://localhost:8080/api/family/connect', { username }, { headers })
      .subscribe(() => {
        this.toastr.success('Family member connected!');
        this.form.reset();
        this.fetchFamilyMembers();
      });
  }

  disconnectFamilyMember(member: FamilyMember) {
    if (!this.user) return;

    if (confirm(`Are you sure you want to disconnect ${member.username}?`)) {
      const headers = { 'X-Username': this.user.username };

      const body = {
        userId: this.user.userId, // include actual user ID
        username: member.username,
      };

      this.http.post('http://localhost:8080/api/family/disconnect', body, { headers }).subscribe({
        next: (res: any) => {
          this.toastr.info(`${member.username} disconnected.`);
          this.fetchFamilyMembers();
          delete this.chats[member.username];
          if (this.selectedMember?.id === member.id) this.selectedMember = null;
        },
        error: (err) => {
          console.error('❌ Error disconnecting:', err);
          this.toastr.error('Failed to disconnect family member');
        },
      });
    }
  }

  // --- Chat Methods ---
  toggleChatPanel() {
    this.showChatPanel = !this.showChatPanel;
  }

  openChat(member: FamilyMember) {
    this.selectedMember = member;
    member.unread = 0; // Reset unread count for this member
    this.showChatPanel = true;

    const headers = { 'X-Username': this.user?.username || '' };

    this.http
      .get<ChatMessage[]>(`http://localhost:8080/api/chat/conversation?other=${member.username}`, {
        headers,
      })
      .subscribe((res) => {
        this.chats[member.username] = res;

        // Optional: mark all received messages as "read" on backend
        // (You can create a /api/chat/markAsRead endpoint if needed)
      });
  }

  sendMessage() {
    if (!this.selectedMember || !this.newMessage.trim() || !this.user) return;
    const to = this.selectedMember.username;
    this.http
      .post('http://localhost:8080/api/chat/send', { to, message: this.newMessage.trim() })
      .subscribe((res: any) => {
        if (!this.chats[to]) this.chats[to] = [];
        this.chats[to].push(res.data);
        this.newMessage = '';
      });
  }

  startPollingMessages() {
    // Run every 5 seconds
    this.pollingSub = timer(0, 5000).subscribe(() => {
      if (!this.user) return;

      const headers = { 'X-Username': this.user.username };

      this.http
        .get<ChatMessage[]>(`http://localhost:8080/api/chat/receive`, { headers })
        .subscribe((res) => {
          res.forEach((msg) => {
            const sender = msg.fromUser;

            // Skip if message already exists (avoid duplicates)
            const exists = this.chats[sender]?.some(
              (m) => new Date(m.createdAt).getTime() === new Date(msg.createdAt).getTime()
            );
            if (exists) return;

            // Add to chat
            if (!this.chats[sender]) this.chats[sender] = [];
            this.chats[sender].push(msg);

            // Handle unread counts only if the chat isn't currently open
            const member = this.familyMembers.find((m) => m.username === sender);
            if (member && (!this.selectedMember || this.selectedMember.username !== sender)) {
              member.unread = (member.unread || 0) + 1;
              this.toastr.info(`New message from ${member.username}`);
            }
          });
        });
    });
  }

  // --- UI Helper Methods ---
  isMyMessage(chat: ChatMessage): boolean {
    return chat.fromUser === this.user?.username;
  }

  // --- Memory Interaction Methods ---
  downloadFile(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=file`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = 'memory-file'; // You can fetch the real filename if available
        a.click();
        URL.revokeObjectURL(objectUrl);
      });
  }

  downloadVoice(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=voice`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      });
  }

  confirmDelete(memoryId: string) {
    this.confirmedMemoryId = memoryId;
    this.showConfirmDialog = true;
  }

  cancelDelete() {
    this.showConfirmDialog = false;
    this.confirmedMemoryId = '';
  }

  deleteMemory(memoryId: string) {
    this.http
      .delete<{ success: boolean; message: string }>(
        `http://localhost:8080/api/memories/${memoryId}`
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.memories = this.memories.filter((m) => m.id !== memoryId);
            this.toastr.success(res.message, 'Deleted');
          } else {
            this.toastr.error(res.message, 'Error');
          }
          this.cancelDelete();
        },
        error: () => {
          this.toastr.error('Failed to delete memory', 'Error');
          this.cancelDelete();
        },
      });
  }

  // --- Pagination ---
  nextPage() {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      const userId = this.user?.isAlzheimer ? this.user.userId : this.selectedMember?.id;
      if (userId) this.loadMemories(userId);
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      const userId = this.user?.isAlzheimer ? this.user.userId : this.selectedMember?.id;
      if (userId) this.loadMemories(userId);
    }
  }
}
